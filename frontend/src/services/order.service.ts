import { api } from './api';
import type { ProductionOrder, Buyer, ProductionUnit, CreateOrderPayload } from '../types';

export const orderService = {
  async getOrders(params?: {
    status?: string;
    buyerId?: string;
    productionUnitId?: string;
    riskLevel?: string;
    search?: string;
  }): Promise<ProductionOrder[]> {
    const response = await api.get('/orders', { params });
    const resData = response.data?.data;
    if (Array.isArray(resData)) {
      return resData;
    }
    if (resData && Array.isArray((resData as any).orders)) {
      return (resData as any).orders;
    }
    if (Array.isArray(response.data?.orders)) {
      return response.data.orders;
    }
    return [];
  },

  async getOrderById(id: string): Promise<ProductionOrder> {
    const response = await api.get(`/orders/${id}`);
    return response.data.data;
  },

  async createOrder(payload: CreateOrderPayload): Promise<ProductionOrder> {
    const response = await api.post('/orders', payload);
    return response.data.data;
  },

  async updateOrder(id: string, payload: Partial<CreateOrderPayload>): Promise<ProductionOrder> {
    const response = await api.put(`/orders/${id}`, payload);
    return response.data.data;
  },

  async deleteOrder(id: string): Promise<void> {
    await api.delete(`/orders/${id}`);
  },

  async getBuyers(): Promise<Buyer[]> {
    const response = await api.get('/orders/buyers');
    return response.data.data;
  },

  async getProductionUnits(): Promise<ProductionUnit[]> {
    const response = await api.get('/orders/production-units');
    return response.data.data;
  },
};
