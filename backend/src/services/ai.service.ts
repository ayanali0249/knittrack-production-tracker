import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';
import { config } from '../config';
import { AI_CATEGORIES } from '../lib/constants';
import { AppError } from '../middleware/errorHandler';
import type { AIClassificationResult, AICategory } from '../types';

// Rule-based fallback keyword dictionaries for Tamil and English
const TAMIL_KEYWORDS: Array<{ category: AICategory; keywords: string[] }> = [
  {
    category: 'Machine breakdown',
    keywords: [
      'மெஷின்', 'பழுது', 'இயந்திர', 'கோளாறு', 'மோட்டார்', 'ஊசி', 'உடைந்து', 'நின்றுவிட்டது', 'வேலை செய்யவில்லை',
      'machine', 'breakdown', 'motor', 'needle', 'broken', 'repair', 'stopped working'
    ],
  },
  {
    category: 'Labour shortage',
    keywords: [
      'தொழிலாளர்', 'ஆட்கள்', 'குறைவாக', 'பற்றாக்குறை', 'வரவில்லை', 'விடுப்பு', 'ஷிப்ட்', 'ஆள்',
      'labour', 'labor', 'shortage', 'absent', 'workers', 'attendance', 'manpower', 'operators'
    ],
  },
  {
    category: 'Material shortage',
    keywords: [
      'துணி', 'நூல்', 'பொத்தான்', 'ஜிப்', 'பற்றாக்குறை', 'தீர்ந்துவிட்டது', 'வரவில்லை', 'துணி சப்ளை', 'யார்ன்',
      'fabric', 'yarn', 'thread', 'button', 'zipper', 'material', 'accessories', 'trims', 'shortage'
    ],
  },
  {
    category: 'Quality issue',
    keywords: [
      'தையல்', 'சரியில்லை', 'வண்ண', 'வண்ண மாற்றம்', 'அளவு', 'பிழை', 'கறை', 'தரம்', 'தோல்வி', 'ரிஜெக்ட்',
      'quality', 'defect', 'stitching fault', 'shade variation', 'measurement', 'stain', 'rejection', 'rejected'
    ],
  },
  {
    category: 'Power outage',
    keywords: [
      'மின்சாரம்', 'தடை', 'கரண்ட்', 'இல்லை', 'ஜெனரேட்டர்', 'மின்வெட்டு',
      'power cut', 'power outage', 'electricity', 'generator', 'eb cut'
    ],
  },
  {
    category: 'Supplier delay',
    keywords: [
      'சப்ளையர்', 'அனுப்பவில்லை', 'பிரிண்டிங் சப்ளையர்', 'வாஷிங் தாமதம்', 'வெளியில்', 'தாமதம்',
      'supplier', 'vendor', 'subcontractor', 'dying delay', 'printing delay', 'washing delay', 'delivery delay'
    ],
  },
  {
    category: 'Weather disruption',
    keywords: [
      'மழை', 'வெள்ளம்', 'புயல்', 'வானிலை', 'போக்குவரத்து',
      'rain', 'heavy rain', 'flood', 'monsoon', 'weather', 'cyclone'
    ],
  },
];

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.gemini.apiKey && config.gemini.apiKey.trim().length > 0) {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    }
  }

  /**
   * Deterministic rule-based fallback classification.
   * Matches Tamil and English keywords and returns best-matching category with confidence.
   */
  classifyFallback(note: string): { category: AICategory; confidence: number } {
    const lowerNote = note.toLowerCase();
    let bestCategory: AICategory = 'Other';
    let maxMatches = 0;

    for (const rule of TAMIL_KEYWORDS) {
      let matches = 0;
      for (const kw of rule.keywords) {
        if (lowerNote.includes(kw.toLowerCase())) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = rule.category;
      }
    }

    const confidence = maxMatches > 0 ? Math.min(0.95, 0.65 + maxMatches * 0.1) : 0.35;
    return { category: bestCategory, confidence };
  }

  /**
   * Classify a production note (Tamil or English) into a predefined category.
   * Uses Google Gemini if configured, otherwise falls back smoothly to Tamil/English keyword matching.
   */
  async classifyNote(note: string): Promise<AIClassificationResult> {
    if (!note || note.trim().length === 0) {
      return { category: null, confidence: null, error: 'No note provided.' };
    }

    const trimmedNote = note.trim();

    // If Gemini API is not configured, use transparent rule-based fallback
    if (!this.genAI || !config.gemini.apiKey) {
      const fallback = this.classifyFallback(trimmedNote);
      return {
        category: fallback.category,
        confidence: fallback.confidence,
        fallbackMode: true,
        error: 'Rule-based fallback classifier active (GEMINI_API_KEY not configured)',
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `You are an expert production issue classifier for a Tiruppur knitwear garment exporter in Tamil Nadu, India.
Classify the following supervisor production note into exactly ONE of these categories:
${AI_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

The note is written by factory supervisors in Tamil, English, or colloquial Tanglish.
Examples:
- "மெஷின் பழுதாகிவிட்டது" -> Machine breakdown
- "தொழிலாளர்கள் குறைவாக உள்ளனர்" -> Labour shortage
- "துணி இன்னும் வரவில்லை" -> Material shortage

Supervisor note: "${trimmedNote}"

Return JSON matching this schema:
{"category": "Category Name", "confidence": 0.95}`;

      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI classification timeout after 8000ms')), 8000)
        ),
      ]);

      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        throw new Error('Non-JSON response received from Gemini');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validCategory = (AI_CATEGORIES as readonly string[]).includes(parsed.category)
        ? (parsed.category as AICategory)
        : 'Other';

      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.85;

      return {
        category: validCategory,
        confidence,
        fallbackMode: false,
      };
    } catch (err) {
      console.warn('Gemini classification failed, switching to fallback:', err instanceof Error ? err.message : err);
      const fallback = this.classifyFallback(trimmedNote);
      return {
        category: fallback.category,
        confidence: fallback.confidence,
        fallbackMode: true,
        error: `AI API unavailable (${err instanceof Error ? err.message : 'Unknown error'}); resolved via rule-based fallback`,
      };
    }
  }

  /**
   * Classify a note and save the result to a production update.
   */
  async classifyAndSave(productionUpdateId: string): Promise<AIClassificationResult> {
    const update = await prisma.productionUpdate.findUnique({
      where: { id: productionUpdateId },
    });

    if (!update) throw new AppError('Production update not found.', 404);
    if (!update.note && !update.originalNote) {
      return { category: null, confidence: null, error: 'No note to classify.' };
    }

    const noteToClassify = update.originalNote || update.note || '';
    const result = await this.classifyNote(noteToClassify);

    if (result.category) {
      await prisma.productionUpdate.update({
        where: { id: productionUpdateId },
        data: {
          aiCategory: result.category,
          aiConfidence: result.confidence,
        },
      });
    }

    return result;
  }

  /**
   * Correct an AI classification by a Merchandiser or Manager.
   * Records audit trail and keeps original preserved.
   */
  async correctClassification(productionUpdateId: string, correctedCategory: string, userId: string) {
    if (!(AI_CATEGORIES as readonly string[]).includes(correctedCategory)) {
      throw new AppError(`Invalid category. Must be one of: ${AI_CATEGORIES.join(', ')}`, 400);
    }

    const update = await prisma.productionUpdate.findUnique({
      where: { id: productionUpdateId },
    });
    if (!update) throw new AppError('Production update not found.', 404);

    await prisma.productionUpdate.update({
      where: { id: productionUpdateId },
      data: { correctedCategory },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CORRECT_CLASSIFICATION',
        entityType: 'ProductionUpdate',
        entityId: productionUpdateId,
        details: {
          previousCategory: update.aiCategory,
          correctedCategory,
        },
      },
    });

    return { previousCategory: update.aiCategory, correctedCategory };
  }

  /**
   * Batch classify all unclassified notes.
   */
  async batchClassify(): Promise<{ processed: number; classified: number; errors: number }> {
    const unclassified = await prisma.productionUpdate.findMany({
      where: {
        note: { not: null },
        aiCategory: null,
      },
      take: 50,
    });

    let classified = 0;
    let errors = 0;

    for (const update of unclassified) {
      try {
        const result = await this.classifyAndSave(update.id);
        if (result.category) classified++;
        else errors++;
      } catch {
        errors++;
      }
      // Gentle pacing
      await new Promise((r) => setTimeout(r, 200));
    }

    return { processed: unclassified.length, classified, errors };
  }
}

export const aiService = new AIService();
