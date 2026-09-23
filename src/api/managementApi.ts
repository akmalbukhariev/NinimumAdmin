import { API_BASE_URL, ApiError, apiRequest } from './client';

export type Row = Record<string, any>;
export interface PageData { items: Row[]; total: number; page: number; page_size: number; }
const m = '/ninimum/api/v1/admin/management';
const q = (params: Record<string, unknown>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') s.set(k,String(v)); });
  const value = s.toString(); return value ? `?${value}` : '';
};

export const listOrders = (token:string, params:Row={}) => apiRequest<PageData>(`${m}/orders${q(params)}`,{token}).then(r=>r.resultData);
export const getOrder = (token:string,id:number) => apiRequest<Row>(`${m}/orders/${id}`,{token}).then(r=>r.resultData);
export const updateOrderStatus = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/orders/${id}/status`,{token,method:'PUT',body:JSON.stringify(data)});

export const listProducts = (token:string, params:Row={}) => apiRequest<PageData>(`${m}/products${q(params)}`,{token}).then(r=>r.resultData);
export const getProduct = (token:string,id:number) => apiRequest<Row>(`${m}/products/${id}`,{token}).then(r=>r.resultData);
export const updateProduct = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/products/${id}`,{token,method:'PUT',body:JSON.stringify(data)});
export const addProductImages = async (token:string,id:number,images:File[]) => {
  const form = new FormData(); images.forEach(f=>form.append('images',f));
  const response = await fetch(`${API_BASE_URL}${m}/products/${id}/images`, { method:'POST', headers:{Accept:'application/json',Authorization:`Bearer ${token}`}, body:form });
  const payload = await response.json(); if (!response.ok || payload.resultCode !== '100') throw new ApiError(payload.resultMsg || 'REQUEST_FAILED',payload.resultCode,response.status); return payload;
};
export const deleteProductImage = (token:string,productId:number,imageId:number) => apiRequest<null>(`${m}/products/${productId}/images/${imageId}`,{token,method:'DELETE'});
export const createProduct = async (token:string,data:Row,images:File[]) => {
  const form = new FormData(); form.append('data', JSON.stringify(data)); images.forEach(f=>form.append('images',f));
  const response = await fetch(`${API_BASE_URL}/ninimum/api/v1/admin/product/createProduct`, { method:'POST', headers:{Accept:'application/json',Authorization:`Bearer ${token}`}, body:form });
  const payload = await response.json(); if (!response.ok || payload.resultCode !== '100') throw new ApiError(payload.resultMsg || 'REQUEST_FAILED',payload.resultCode,response.status); return payload;
};
export const listFiscalPackages = (token:string, keyword='') => apiRequest<Row[]>('/ninimum/api/v1/admin/product/getFiscalMxikPackageList',{token,method:'POST',body:JSON.stringify({keyword,pageSize:100,offset:0})}).then(r=>r.resultData);

export const listCategories = (token:string) => apiRequest<Row[]>(`${m}/categories`,{token}).then(r=>r.resultData);
export const createCategory = (token:string,data:Row) => apiRequest<null>(`${m}/categories`,{token,method:'POST',body:JSON.stringify(data)});
export const updateCategory = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/categories/${id}`,{token,method:'PUT',body:JSON.stringify(data)});

export const listCustomers = (token:string,params:Row={}) => apiRequest<PageData>(`${m}/customers${q(params)}`,{token}).then(r=>r.resultData);
export const setCustomerActive = (token:string,id:number,active:boolean) => apiRequest<null>(`${m}/customers/${id}/active`,{token,method:'PUT',body:JSON.stringify({active})});

export const listSubscriptions = (token:string,params:Row={}) => apiRequest<PageData>(`${m}/subscriptions${q(params)}`,{token}).then(r=>r.resultData);
export const setSubscriptionStatus = (token:string,id:number,status:string) => apiRequest<null>(`${m}/subscriptions/${id}/status`,{token,method:'PUT',body:JSON.stringify({status})});
export const listTariffs = (token:string) => apiRequest<Row[]>(`${m}/tariffs`,{token}).then(r=>r.resultData);
export const createTariff = (token:string,data:Row) => apiRequest<null>(`${m}/tariffs`,{token,method:'POST',body:JSON.stringify(data)});
export const updateTariff = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/tariffs/${id}`,{token,method:'PUT',body:JSON.stringify(data)});

export const listDeliveryJobs = (token:string,params:Row={}) => apiRequest<PageData>(`${m}/delivery/jobs${q(params)}`,{token}).then(r=>r.resultData);
export const listDeliveryWorkers = (token:string) => apiRequest<Row[]>(`${m}/delivery/workers`,{token}).then(r=>r.resultData);
export const createDeliveryWorker = (token:string,data:Row) => apiRequest<Row>('/ninimum/api/v1/delivery-app/admin/createWorker',{token,method:'POST',body:JSON.stringify(data)}).then(r=>r.resultData);
export const setDeliveryWorkerStatus = (token:string,id:number,status:string) => apiRequest<null>(`${m}/delivery/workers/${id}/status`,{token,method:'PUT',body:JSON.stringify({status})});
export const updateDeliveryJob = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/delivery/jobs/${id}`,{token,method:'PUT',body:JSON.stringify(data)});

export const listReviews = (token:string,params:Row={}) => apiRequest<PageData>(`${m}/reviews${q(params)}`,{token}).then(r=>r.resultData);
export const setReviewActive = (token:string,id:number,active:boolean) => apiRequest<null>(`${m}/reviews/${id}/active`,{token,method:'PUT',body:JSON.stringify({active})});
export const listQuestions = (token:string,params:Row={}) => apiRequest<PageData>(`${m}/questions${q(params)}`,{token}).then(r=>r.resultData);
export const answerQuestion = (token:string,id:number,answer:string) => apiRequest<null>(`${m}/questions/${id}/answer`,{token,method:'PUT',body:JSON.stringify({answer})});
export const setQuestionActive = (token:string,id:number,active:boolean) => apiRequest<null>(`${m}/questions/${id}/active`,{token,method:'PUT',body:JSON.stringify({active})});

export const listPromotions = (token:string) => apiRequest<Row[]>(`${m}/promotions`,{token}).then(r=>r.resultData);
export const createPromotion = (token:string,data:Row) => apiRequest<null>(`${m}/promotions`,{token,method:'POST',body:JSON.stringify(data)});
export const updatePromotion = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/promotions/${id}`,{token,method:'PUT',body:JSON.stringify(data)});
export const listBanners = (token:string) => apiRequest<Row[]>(`${m}/banners`,{token}).then(r=>r.resultData);
export const replaceBanners = (token:string,data:Row[]) => apiRequest<null>(`${m}/banners`,{token,method:'PUT',body:JSON.stringify(data)});
export const listCoupons = (token:string) => apiRequest<Row[]>(`${m}/coupons`,{token}).then(r=>r.resultData);
export const createCoupon = (token:string,data:Row) => apiRequest<null>(`${m}/coupons`,{token,method:'POST',body:JSON.stringify(data)});
export const updateCoupon = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/coupons/${id}`,{token,method:'PUT',body:JSON.stringify(data)});

export const getSettings = (token:string) => apiRequest<Row>(`${m}/settings`,{token}).then(r=>r.resultData);
export const updateSettings = (token:string,data:Row) => apiRequest<null>(`${m}/settings`,{token,method:'PUT',body:JSON.stringify(data)});
export const listAdmins = (token:string) => apiRequest<Row[]>(`${m}/admins`,{token}).then(r=>r.resultData);
export const setAdminStatus = (token:string,id:number,status:string) => apiRequest<null>(`${m}/admins/${id}/status`,{token,method:'PUT',body:JSON.stringify({status})});
export const registerAdmin = (token:string,data:Row) => apiRequest<null>('/ninimum/api/v1/admin/register',{token,method:'POST',body:JSON.stringify(data)});

export const imageUrl = (value?: string) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/uploads/')) return `${API_BASE_URL}${value}`;
  if (value.startsWith('products/') || value.startsWith('reviews/')) return `${API_BASE_URL}/uploads/${value}`;
  return `${API_BASE_URL}/uploads/products/${value}`;
};
