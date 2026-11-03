import { Response } from 'express';
import { aiService } from '../services/ai.service';
import type { AuthRequest } from '../types';

export class AIController {
  /**
   * POST /api/ai/classify
   * Classify a production note.
   */
  async classify(req: AuthRequest, res: Response) {
    const { note } = req.body;
    const result = await aiService.classifyNote(note);
    res.json({ success: true, data: result });
  }

  /**
   * POST /api/ai/classify/:updateId
   * Classify the note of a specific production update and save the result.
   */
  async classifyUpdate(req: AuthRequest, res: Response) {
    const updateId = Array.isArray(req.params.updateId) ? req.params.updateId[0] : req.params.updateId;
    const result = await aiService.classifyAndSave(updateId);
    res.json({ success: true, data: result });
  }

  /**
   * PUT /api/ai/correct/:updateId
   * Correct the AI classification of a production update.
   */
  async correctClassification(req: AuthRequest, res: Response) {
    const { category } = req.body;
    const updateId = Array.isArray(req.params.updateId) ? req.params.updateId[0] : req.params.updateId;
    const result = await aiService.correctClassification(
      updateId,
      category,
      req.user!.userId
    );
    res.json({ success: true, data: result });
  }

  /**
   * POST /api/ai/batch-classify
   * Batch classify all unclassified notes.
   */
  async batchClassify(_req: AuthRequest, res: Response) {
    const result = await aiService.batchClassify();
    res.json({ success: true, data: result });
  }
}

export const aiController = new AIController();
