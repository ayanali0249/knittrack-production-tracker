import { api } from './api';
import type { ProductionOrder } from '../types';

export const buyerService = {
  async getMyOrders(): Promise<ProductionOrder[]> {
    try {
      const response = await api.get('/buyer/portal');
      const data = response.data?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.orders)) return data.orders;
      return [];
    } catch {
      const response = await api.get('/orders');
      const data = response.data?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.orders)) return data.orders;
      return [];
    }
  },

  async getMyOrderDetail(orderId: string): Promise<ProductionOrder> {
    try {
      const response = await api.get(`/buyer/portal/${orderId}`);
      return response.data?.data;
    } catch {
      const response = await api.get(`/orders/${orderId}`);
      return response.data?.data;
    }
  },
};
