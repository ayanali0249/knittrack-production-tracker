import { api } from './api';
import type { AIClassificationResult } from '../types';

export const aiService = {
  async classifyNote(note: string): Promise<AIClassificationResult> {
    const response = await api.post('/ai/classify', { note });
    return response.data.data;
  },

  async correctClassification(updateId: string, category: string): Promise<any> {
    const response = await api.put(`/ai/correct/${updateId}`, { category });
    return response.data.data;
  },

  async batchClassify(): Promise<any> {
    const response = await api.post('/ai/batch-classify');
    return response.data.data;
  },
};
