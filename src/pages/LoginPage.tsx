import { LockOutlined, StorefrontRounded, VisibilityOffRounded, VisibilityRounded } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../i18n/LanguageProvider';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { t } = useLanguage();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!loginId.trim() || !password) return;

    setSubmitting(true);
    setError(null);

    try {
      await login(loginId.trim(), password);
      const state = location.state as { from?: string } | null;
      navigate(state?.from || '/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === 'NETWORK_ERROR') {
          setError(t('login.error.network'));
        } else if (err.resultCode === '253') {
          setError(t('login.error.inactive'));
        } else if (err.resultCode === '141' || err.resultCode === '255' || err.resultCode === '250') {
          setError(t('login.error.invalid'));
        } else {
          setError(t('login.error.generic'));
        }
      } else {
        setError(t('login.error.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F8FB', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          position: 'relative',
          overflow: 'hidden',
          p: 7,
          background: 'linear-gradient(145deg, #22292F 0%, #161B20 100%)',
          color: '#fff',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} sx={{ position: 'relative', zIndex: 2 }}>
          <Box display="flex" alignItems="center" gap={1.4}>
            <Box sx={{ width: 42, height: 42, borderRadius: 3, bgcolor: '#FD473C', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 21 }}>N</Box>
            <Box>
              <Typography sx={{ fontSize: 19, fontWeight: 850 }}>Ninimum</Typography>
              <Typography sx={{ color: '#8C959D', fontSize: 11.5, fontWeight: 700 }}>ADMIN PANEL</Typography>
            </Box>
          </Box>
          <LanguageSelector dark />
        </Box>

        <Box sx={{ maxWidth: 560, position: 'relative', zIndex: 2 }}>
          <Typography sx={{ fontSize: 47, lineHeight: 1.08, fontWeight: 850, letterSpacing: '-0.045em' }}>
            {t('login.brandTitle')}
          </Typography>
          <Typography sx={{ mt: 2.4, color: '#A8AFB5', fontSize: 16, lineHeight: 1.7, maxWidth: 500 }}>
            {t('login.brandSubtitle')}
          </Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="center" sx={{ color: '#7E878E', position: 'relative', zIndex: 2 }}>
          <StorefrontRounded sx={{ fontSize: 18 }} />
          <Typography sx={{ fontSize: 12 }}>{t('login.platform')}</Typography>
        </Box>

        <Box sx={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', border: '1px solid rgba(253,71,60,0.15)', right: -220, top: 30 }} />
        <Box sx={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', bgcolor: 'rgba(253,71,60,0.06)', right: -40, bottom: -190 }} />
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: '92px 16px 24px', sm: 5 }, position: 'relative' }}>
        <Box sx={{ display: { xs: 'flex', lg: 'none' }, position: 'absolute', top: 18, left: 16, right: 16, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '11px', bgcolor: '#FD473C', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 19 }}>N</Box>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 850, lineHeight: 1 }}>Ninimum</Typography>
              <Typography sx={{ mt: 0.35, color: 'text.secondary', fontSize: 10.5, fontWeight: 700 }}>ADMIN PANEL</Typography>
            </Box>
          </Box>
          <LanguageSelector />
        </Box>

        <Paper elevation={0} sx={{ width: '100%', maxWidth: 455, p: { xs: 2.5, sm: 4.5 }, border: '1px solid', borderColor: 'divider', borderRadius: { xs: 3, sm: 3.5 } }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: '#FFF0EF', color: '#FD473C', display: 'grid', placeItems: 'center', mb: 2.5 }}>
            <LockOutlined />
          </Box>
          <Typography variant="h4" sx={{ fontSize: { xs: 26, sm: 29 } }}>{t('login.title')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.8, fontSize: 13.5 }}>
            {t('login.subtitle')}
          </Typography>

          {error && <Alert severity="error" sx={{ mt: 2.4 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3.3 }}>
            <Typography sx={{ mb: 0.7, fontSize: 12.5, fontWeight: 750 }}>{t('login.loginId')}</Typography>
            <TextField
              fullWidth
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder={t('login.loginPlaceholder')}
              autoComplete="username"
              disabled={submitting}
            />

            <Typography sx={{ mt: 2.2, mb: 0.7, fontSize: 12.5, fontWeight: 750 }}>{t('login.password')}</Typography>
            <TextField
              fullWidth
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
              disabled={submitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((value) => !value)} edge="end" tabIndex={-1}>
                      {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting || !loginId.trim() || !password}
              sx={{ mt: 3, height: 48 }}
            >
              {submitting ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
