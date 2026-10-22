import { apiRequest } from './client';
import type { PageData, Row } from './managementApi';

// TZ v10 §9 "Pul": owner and Director only (money.view / money.edit).
const base = '/ninimum/api/v1/admin/finance';
const get = <T>(token: string, path: string) => apiRequest<T>(`${base}${path}`, { token }).then(r => r.resultData);
const send = <T>(token: string, path: string, method: string, body: unknown) => apiRequest<T>(`${base}${path}`, { token, method, body: JSON.stringify(body) }).then(r => r.resultData);
const q = (params: Row) => { const s = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.set(k, String(v)); }); const t = s.toString(); return t ? `?${t}` : ''; };

export const accounts = (token: string) => get<Row[]>(token, '/accounts');
export const setOpening = (token: string, id: number, body: Row) => send<Row[]>(token, `/accounts/${id}`, 'PUT', body);
export const expenseTypes = (token: string) => get<Row[]>(token, '/expense-types');
export const addExpenseType = (token: string, name: string) => send<Row[]>(token, '/expense-types', 'POST', { name });
export const saveExpenseType = (token: string, id: number, body: Row) => send<Row[]>(token, `/expense-types/${id}`, 'PUT', body);
export const documents = (token: string, params: Row) => get<PageData>(token, `/documents${q(params)}`);
export const createDocument = (token: string, body: Row) => send<number>(token, '/documents', 'POST', body);
export const reverseDocument = (token: string, id: number, reason: string) => send<null>(token, `/documents/${id}/reverse`, 'POST', { reason });
export const documentPhoto = (token: string, id: number) => get<Row>(token, `/documents/${id}/photo`);
export const counts = (token: string) => get<Row[]>(token, '/counts');
export const addCount = (token: string, body: Row) => send<Row>(token, '/counts', 'POST', body);
export const movement = (token: string, from: string, to: string) => get<Row>(token, `/movement${q({ from, to })}`);
export const monthly = (token: string, month: string) => get<Row>(token, `/monthly${q({ month })}`);
