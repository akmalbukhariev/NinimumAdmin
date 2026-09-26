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
export const updateProductInline = (token:string,id:number,data:Row) => apiRequest<null>(`${m}/products/${id}`,{token,method:'PUT',showLoading:false,body:JSON.stringify(data)});
export const deleteProduct = (token:string,id:number) => apiRequest<null>(`${m}/products/${id}`,{token,method:'DELETE'});
const IMAGE_SAFE_UPLOAD_BYTES = 450 * 1024;
const IMAGE_RETRY_UPLOAD_BYTES = 280 * 1024;
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_MIN_DIMENSION = 480;

const loadBrowserImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new ApiError('IMAGE_READ_FAILED'));
  };
  image.src = url;
});

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new ApiError('IMAGE_PROCESSING_FAILED')),
    type,
    quality,
  );
});

const optimizeProductImage = async (file: File, targetBytes = IMAGE_SAFE_UPLOAD_BYTES): Promise<File> => {
  if (!file.type.startsWith('image/')) throw new ApiError('ONLY_IMAGE_FILES_ALLOWED');

  const image = await loadBrowserImage(file);
  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const preserveTransparency = file.type === 'image/png' || file.type === 'image/webp';

  // Keep already-small images untouched. Bigger images are reduced before Base64 upload
  // so the request stays safely below server/proxy body limits.
  if (file.size <= targetBytes && largestSide <= IMAGE_MAX_DIMENSION) return file;

  let scale = Math.min(1, IMAGE_MAX_DIMENSION / largestSide);
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));

  const outputType = preserveTransparency
    ? (file.type === 'image/webp' ? 'image/webp' : 'image/png')
    : 'image/jpeg';
  const extension = outputType === 'image/png' ? '.png' : outputType === 'image/webp' ? '.webp' : '.jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';

  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new ApiError('IMAGE_PROCESSING_FAILED');

    // Never paint a background here. PNG/WebP alpha remains transparent.
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    blob = await canvasToBlob(
      canvas,
      outputType,
      outputType === 'image/jpeg' ? 0.84 : outputType === 'image/webp' ? 0.86 : undefined,
    );

    if (blob.size <= targetBytes || Math.max(width, height) <= IMAGE_MIN_DIMENSION) break;

    // Scale according to how far we are above the target, but avoid a visually harsh jump.
    const ratio = Math.sqrt(targetBytes / blob.size) * 0.94;
    const nextScale = Math.max(0.72, Math.min(0.90, ratio));
    width = Math.max(IMAGE_MIN_DIMENSION, Math.round(width * nextScale));
    height = Math.max(IMAGE_MIN_DIMENSION, Math.round(height * nextScale));
  }

  if (!blob) throw new ApiError('IMAGE_PROCESSING_FAILED');
  return new File([blob], `${baseName}${extension}`, { type: outputType, lastModified: Date.now() });
};

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const value = String(reader.result ?? '');
    const comma = value.indexOf(',');
    resolve(comma >= 0 ? value.slice(comma + 1) : value);
  };
  reader.onerror = () => reject(new ApiError('IMAGE_READ_FAILED'));
  reader.readAsDataURL(file);
});

export const addProductImages = async (token:string,id:number,images:File[]) => {
  for (const originalFile of images) {
    let file = await optimizeProductImage(originalFile, IMAGE_SAFE_UPLOAD_BYTES);

    const upload = async (candidate: File) => {
      const base64 = await fileToBase64(candidate);
      await apiRequest<null>(`${m}/products/${id}/image-data`, {
        token,
        method:'POST',
        body:JSON.stringify({
          file_name:candidate.name || 'product-image',
          content_type:candidate.type || '',
          base64,
        }),
      });
    };

    try {
      await upload(file);
    } catch (error) {
      // The earlier working implementation succeeded because it sent a much smaller
      // image payload. If the browser/server drops the request, shrink once more while
      // preserving PNG/WebP transparency and retry automatically.
      if (error instanceof ApiError && error.message === 'NETWORK_ERROR') {
        file = await optimizeProductImage(originalFile, IMAGE_RETRY_UPLOAD_BYTES);
        await upload(file);
      } else {
        throw error;
      }
    }
  }
};

export const deleteProductImage = (token:string,productId:number,imageId:number) => apiRequest<null>(`${m}/products/${productId}/images/${imageId}`,{token,method:'DELETE'});

export const createProduct = async (token:string,data:Row,images:File[]) => {
  const response = await apiRequest<Row>('/ninimum/api/v1/admin/product/createProductJson', {
    token,
    method:'POST',
    body:JSON.stringify(data),
  });
  const productId = Number(response.resultData?.product_id);
  if (!productId) throw new ApiError('PRODUCT_ID_MISSING');
  if (images.length > 0) {
    try {
      await addProductImages(token, productId, images);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'IMAGE_UPLOAD_FAILED';
      throw new ApiError(`PRODUCT_CREATED_IMAGE_UPLOAD_FAILED:${productId}:${reason}`);
    }
  }
  return response;
};

export const listFiscalMxik = (token:string, keyword='', pageSize=20, offset=0) => apiRequest<Row[]>('/ninimum/api/v1/admin/product/getFiscalMxikList',{token,method:'POST',showLoading:false,body:JSON.stringify({keyword,pageSize,offset})}).then(r=>r.resultData);
export const listFiscalPackages = (token:string, keyword='', mxikId?:number) => apiRequest<Row[]>('/ninimum/api/v1/admin/product/getFiscalMxikPackageList',{token,method:'POST',showLoading:false,body:JSON.stringify({keyword,mxikId,pageSize:100,offset:0})}).then(r=>r.resultData);

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
export const deleteDeliveryWorker = (token:string,id:number) => apiRequest<null>(`${m}/delivery/workers/${id}`,{token,method:'DELETE'});
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
