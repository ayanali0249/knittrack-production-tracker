import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../services/ai.service';
import prisma from '../lib/prisma';
import { AI_CATEGORIES } from '../lib/constants';

vi.mock('../lib/prisma', () => ({
  default: {
    productionUpdate: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('AI Classification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tamil note classification (Rule-based Fallback & Pattern Matching)', () => {
    it('should classify "மெஷின் பழுதாகிவிட்டது" as Machine breakdown', async () => {
      const result = await aiService.classifyNote('மெஷின் பழுதாகிவிட்டது');
      expect(result.category).toBe('Machine breakdown');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify "தொழிலாளர்கள் குறைவாக உள்ளனர்" as Labour shortage', async () => {
      const result = await aiService.classifyNote('தொழிலாளர்கள் குறைவாக உள்ளனர்');
      expect(result.category).toBe('Labour shortage');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify "துணி இன்னும் வரவில்லை" as Material shortage', async () => {
      const result = await aiService.classifyNote('துணி இன்னும் வரவில்லை');
      expect(result.category).toBe('Material shortage');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify "தையல் சரியில்லை" as Quality issue', async () => {
      const result = await aiService.classifyNote('தையல் சரியில்லை');
      expect(result.category).toBe('Quality issue');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify "மின்சாரம் தடைப்பட்டது" as Power outage', async () => {
      const result = await aiService.classifyNote('மின்சாரம் தடைப்பட்டது');
      expect(result.category).toBe('Power outage');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('English note classification', () => {
    it('should classify English machine breakdown note', async () => {
      const result = await aiService.classifyNote('Sewing machine needle broken, motor stopped working');
      expect(result.category).toBe('Machine breakdown');
    });

    it('should classify English labour shortage note', async () => {
      const result = await aiService.classifyNote('5 workers absent today due to festival, severe manpower shortage');
      expect(result.category).toBe('Labour shortage');
    });

    it('should classify English material shortage note', async () => {
      const result = await aiService.classifyNote('Fabric shipment delayed from mill, yarn shortage');
      expect(result.category).toBe('Material shortage');
    });

    it('should return Other for unrecognized / generic text', async () => {
      const result = await aiService.classifyNote('Standard operations continuing');
      expect(result.category).toBe('Other');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Validation & Edge cases', () => {
    it('should handle empty or whitespace notes gracefully', async () => {
      const result1 = await aiService.classifyNote('');
      expect(result1.category).toBeNull();
      expect(result1.error).toContain('No note provided');

      const result2 = await aiService.classifyNote('   ');
      expect(result2.category).toBeNull();
      expect(result2.error).toContain('No note provided');
    });

    it('should never alter production quantities or deadlines when classifying', async () => {
      // AI service only returns classification result or updates aiCategory
      const updateData = {
        id: 'update-1',
        note: 'மெஷின் பழுதாகிவிட்டது',
        originalNote: 'மெஷின் பழுதாகிவிட்டது',
        quantity: 500,
      };

      (prisma.productionUpdate.findUnique as any).mockResolvedValue(updateData);
      (prisma.productionUpdate.update as any).mockResolvedValue({
        ...updateData,
        aiCategory: 'Machine breakdown',
        aiConfidence: 0.85,
      });

      await aiService.classifyAndSave('update-1');

      expect(prisma.productionUpdate.update).toHaveBeenCalledWith({
        where: { id: 'update-1' },
        data: {
          aiCategory: 'Machine breakdown',
          aiConfidence: expect.any(Number),
        },
      });
      // Verified that quantity and date fields are untouched
    });
  });

  describe('Merchandiser category correction & Audit logging', () => {
    it('should record corrected category and create audit log entry', async () => {
      (prisma.productionUpdate.findUnique as any).mockResolvedValue({
        id: 'update-1',
        aiCategory: 'Other',
      });
      (prisma.productionUpdate.update as any).mockResolvedValue({});
      (prisma.auditLog.create as any).mockResolvedValue({});

      const result = await aiService.correctClassification(
        'update-1',
        'Machine breakdown',
        'merch-user-id'
      );

      expect(result.correctedCategory).toBe('Machine breakdown');
      expect(prisma.productionUpdate.update).toHaveBeenCalledWith({
        where: { id: 'update-1' },
        data: { correctedCategory: 'Machine breakdown' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'merch-user-id',
          action: 'CORRECT_CLASSIFICATION',
          entityType: 'ProductionUpdate',
          entityId: 'update-1',
          details: {
            previousCategory: 'Other',
            correctedCategory: 'Machine breakdown',
          },
        },
      });
    });

    it('should reject invalid category not in predefined list', async () => {
      await expect(
        aiService.correctClassification('update-1', 'Invalid Category Name', 'user-1')
      ).rejects.toThrow('Invalid category');
    });
  });
});
