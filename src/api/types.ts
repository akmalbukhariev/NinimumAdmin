export interface ApiResponse<T> {
  resultCode: string;
  resultMsg: string;
  resultData: T;
  apiVersion?: string;
  webVersion?: string;
}

export interface AdminUser {
  id: number;
  login_id: string;
  name: string;
  role: string;
  status: string;
  /** M14: DIRECTOR, PURCHASING, OPERATOR, OBSERVER or ADMIN (restricted administrator). */
  staff_role?: string;
  /** M14: effective permissions, e.g. "orders.edit", "money.view". Missing on older backends. */
  permissions?: string[];
}

export interface AdminLoginData extends AdminUser {
  access_token: string;
  refresh_token?: string;
}

export interface DashboardSummary {
  revenue: number | null;
  paid_undelivered?: number | null;
  subscription_receipts?: number | null;
  supplier_due_week?: number | null;
  order_count: number;
  customer_count: number;
  subscription_count: number;
}

export interface DashboardSale {
  sales_date: string;
  total: number;
}

export interface DashboardOrderStatus {
  status: string;
  count: number;
}

export interface DashboardRecentOrder {
  order_id: number;
  order_number: string;
  customer_name: string;
  total_price: number;
  status: string;
  payment_status: string;
  ordered_at: string;
}

export interface DashboardLowStockProduct {
  product_id: number;
  product_name: string;
  stock_quantity: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  sales_last_7_days: DashboardSale[];
  order_status_today: DashboardOrderStatus[];
  recent_orders: DashboardRecentOrder[];
  low_stock_products: DashboardLowStockProduct[];
}
