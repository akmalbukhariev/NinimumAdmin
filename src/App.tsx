import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import AdminLayout from './layout/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<PlaceholderPage titleKey="nav.orders" descriptionKey="placeholder.orders" />} />
          <Route path="/products" element={<PlaceholderPage titleKey="nav.products" descriptionKey="placeholder.products" />} />
          <Route path="/categories" element={<PlaceholderPage titleKey="nav.categories" descriptionKey="placeholder.categories" />} />
          <Route path="/customers" element={<PlaceholderPage titleKey="nav.customers" descriptionKey="placeholder.customers" />} />
          <Route path="/subscriptions" element={<PlaceholderPage titleKey="nav.subscriptions" descriptionKey="placeholder.subscriptions" />} />
          <Route path="/delivery" element={<PlaceholderPage titleKey="nav.delivery" descriptionKey="placeholder.delivery" />} />
          <Route path="/reviews" element={<PlaceholderPage titleKey="nav.reviews" descriptionKey="placeholder.reviews" />} />
          <Route path="/promotions" element={<PlaceholderPage titleKey="nav.promotions" descriptionKey="placeholder.promotions" />} />
          <Route path="/settings" element={<PlaceholderPage titleKey="nav.settings" descriptionKey="placeholder.settings" />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
