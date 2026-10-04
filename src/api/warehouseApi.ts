import { apiRequest } from './client';
import type { PageData, Row } from './managementApi';

const base = '/ninimum/api/v1/admin/warehouse';
const get = <T>(token: string, path: string) => apiRequest<T>(`${base}${path}`, { token }).then(r => r.resultData);
const post = <T>(token: string, path: string, body: unknown = {}) => apiRequest<T>(`${base}${path}`, {
  token, method: 'POST', body: JSON.stringify(body),
}).then(r => r.resultData);
export const warehouseStatus = (token: string) => get<{enabled: boolean; stage: number}>(token, '/status');
export const locations = (token: string) => get<Row[]>(token, '/locations');
export const createLocation = (token: string, body: Row) => post<number>(token, '/locations', body);
export const stock = (token: string, page: number, search: string) => get<PageData>(token, `/stock?page=${page}&page_size=20&search=${encodeURIComponent(search)}`);
export const receipts = (token: string, page: number) => get<PageData>(token, `/receipts?page=${page}&page_size=20`);
export const receipt = (token: string, id: number) => get<Row>(token, `/receipts/${id}`);
export const createReceipt = (token: string, body: Row) => post<number>(token, '/receipts', body);
export const postReceipt = (token: string, id: number) => post<number>(token, `/receipts/${id}/post`);
export const reverseReceipt = (token: string, id: number, reason: string) => post<number>(token, `/receipts/${id}/reverse`, {reason});
export const movements = (token: string, page: number, product: string) => get<PageData>(token, `/movements?page=${page}&page_size=20${product ? `&product_id=${encodeURIComponent(product)}` : ''}`);
export const preparation = (token: string, page: number) => get<PageData>(token, `/preparation?page=${page}&page_size=20`);
export const preparationItems = (token: string, id: number) => get<Row[]>(token, `/preparation/${id}/items`);
