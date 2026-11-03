import { api } from './api';
import type { DashboardSummary, OrderDelayAnalysis } from '../types';

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const response = await api.get('/dashboard/summary');
    return response.data.data;
  },

  async getEfficiency(): Promise<any> {
    const response = await api.get('/dashboard/efficiency');
    return response.data.data;
  },

  async getOrderDelay(orderId: string): Promise<OrderDelayAnalysis> {
    const response = await api.get(`/dashboard/delay/${orderId}`);
    return response.data.data;
  },

  async recalculate(): Promise<any> {
    const response = await api.post('/dashboard/recalculate');
    return response.data.data;
  },
};
