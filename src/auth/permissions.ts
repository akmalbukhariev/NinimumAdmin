export const restrictedPaths = ['/orders', '/products', '/categories', '/delivery'];
export function canAccess(role: string | undefined, path: string): boolean {
  return role === 'SUPER_ADMIN' || (role === 'ADMIN' && restrictedPaths.includes(path));
}
export function homePath(role: string | undefined): string {
  return role === 'SUPER_ADMIN' ? '/dashboard' : '/orders';
}
