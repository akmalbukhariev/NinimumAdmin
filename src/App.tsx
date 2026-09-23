import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import AdminLayout from './layout/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { CategoriesPage, CustomersPage, DeliveryPage, OrdersPage, ProductsPage, PromotionsPage, ReviewsPage, SettingsPage, SubscriptionsPage } from './pages/ManagementPages';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
