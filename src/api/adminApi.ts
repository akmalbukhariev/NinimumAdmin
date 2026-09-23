import { apiRequest } from './client';
import type { AdminLoginData, AdminUser, DashboardData } from './types';

export async function loginAdmin(loginId: string, password: string) {
  const response = await apiRequest<AdminLoginData>('/ninimum/api/v1/admin/login', {
    method: 'POST',
    body: JSON.stringify({ login_id: loginId, password }),
  });
  return response.resultData;
}

export async function getAdminMe(token: string) {
  const response = await apiRequest<AdminUser>('/ninimum/api/v1/admin/me', { token });
  return response.resultData;
}

export async function getDashboard(token: string) {
  const response = await apiRequest<DashboardData>('/ninimum/api/v1/admin/dashboard', { token });
  return response.resultData;
}
