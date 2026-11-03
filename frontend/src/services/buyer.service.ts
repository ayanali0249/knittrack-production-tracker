import { api } from './api';
import type { ProductionOrder } from '../types';

export const buyerService = {
  async getMyOrders(): Promise<ProductionOrder[]> {
    const response = await api.get('/buyer/orders');
    return response.data.data;
  },

  async getMyOrderDetail(orderId: string): Promise<ProductionOrder> {
    const response = await api.get(`/buyer/orders/${orderId}`);
    return response.data.data;
  },
};
