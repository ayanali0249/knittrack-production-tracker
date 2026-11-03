import { api } from './api';
import type { ProductionUpdate } from '../types';

export const productionService = {
  async submitDailyUpdate(payload: {
    orderStageId: string;
    quantity: number;
    date?: string;
    note?: string;
    photo?: File;
  }): Promise<ProductionUpdate> {
    const formData = new FormData();
    formData.append('orderStageId', payload.orderStageId);
    formData.append('quantity', payload.quantity.toString());
    if (payload.date) formData.append('date', payload.date);
    if (payload.note) formData.append('note', payload.note);
    if (payload.photo) formData.append('photo', payload.photo);

    const response = await api.post('/production/updates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async getUpdates(params?: {
    orderStageId?: string;
    orderId?: string;
    supervisorId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ProductionUpdate[]> {
    const response = await api.get('/production/updates', { params });
    return response.data.data;
  },

  async getOrderTimeline(orderId: string): Promise<any> {
    const response = await api.get(`/production/timeline/${orderId}`);
    return response.data.data;
  },
};
