import { api } from './api';
import type { User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const response = await api.post('/auth/login', { email, password });
    return response.data.data.user;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getMe(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data.data.user;
  },
};
