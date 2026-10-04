import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { canAccess, homePath } from './permissions';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, admin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={34} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccess(admin?.role, location.pathname)) {
    return <Navigate to={homePath(admin?.role)} replace />;
  }
  return <Outlet />;
}
