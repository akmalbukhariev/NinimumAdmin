import type { AdminUser } from '../api/types';

// Pages a restricted admin could open before M14; used only if the server sends no permission list.
export const restrictedPaths = ['/problems', '/orders', '/products', '/categories', '/delivery'];
// M14: the "view" permission each page needs. Pages not listed (settings, timers) are owner-only.
export const pagePermissions: Record<string, string> = {
  '/dashboard': 'dashboard.view', '/problems': 'problems.view', '/orders': 'orders.view', '/products': 'products.view',
  '/categories': 'categories.view', '/customers': 'customers.view', '/subscriptions': 'subscriptions.view',
  '/warehouse': 'warehouse.view', '/inventory': 'inventory.view', '/suppliers': 'suppliers.view', '/delivery': 'delivery.view',
  '/reviews': 'reviews.view', '/promotions': 'promotions.view',
};
const order = ['/dashboard', '/orders', '/problems', '/customers', '/products', '/categories', '/subscriptions', '/warehouse', '/inventory', '/suppliers', '/delivery', '/reviews', '/promotions'];

/** True when the admin holds the permission ("x.view" is also met by "x.edit"). The owner holds everything. */
export function can(admin: AdminUser | null | undefined, permission: string): boolean {
  if (admin?.role === 'SUPER_ADMIN') return true;
  const held = admin?.permissions;
  if (!held) return false;
  return held.includes(permission) || (permission.endsWith('.view') && held.includes(permission.replace(/\.view$/, '.edit')));
}
export function canAccess(admin: AdminUser | null | undefined, path: string): boolean {
  if (admin?.role === 'SUPER_ADMIN') return true;
  if (admin?.role !== 'ADMIN') return false;
  if (!admin.permissions) return restrictedPaths.includes(path);
  const needed = pagePermissions[path];
  return needed !== undefined && can(admin, needed);
}
export function homePath(admin: AdminUser | null | undefined): string {
  if (admin?.role === 'SUPER_ADMIN') return '/dashboard';
  return order.find(path => canAccess(admin, path)) ?? '/orders';
}
