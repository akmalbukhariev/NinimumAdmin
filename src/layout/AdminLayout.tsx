import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import {
  CategoryRounded,
  DashboardRounded,
  DeliveryDiningRounded,
  Inventory2Rounded,
  LocalOfferRounded,
  LogoutRounded,
  MenuRounded,
  NotificationsNoneRounded,
  PeopleAltRounded,
  RateReviewRounded,
  ReceiptLongRounded,
  SettingsRounded,
  WorkspacePremiumRounded,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/translations';

const drawerWidth = 262;

type NavItem = { labelKey: TranslationKey; path: string; icon: ReactNode };

const primaryItems: NavItem[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: <DashboardRounded /> },
  { labelKey: 'nav.orders', path: '/orders', icon: <ReceiptLongRounded /> },
  { labelKey: 'nav.products', path: '/products', icon: <Inventory2Rounded /> },
  { labelKey: 'nav.categories', path: '/categories', icon: <CategoryRounded /> },
  { labelKey: 'nav.customers', path: '/customers', icon: <PeopleAltRounded /> },
  { labelKey: 'nav.subscriptions', path: '/subscriptions', icon: <WorkspacePremiumRounded /> },
  { labelKey: 'nav.delivery', path: '/delivery', icon: <DeliveryDiningRounded /> },
];

const secondaryItems: NavItem[] = [
  { labelKey: 'nav.reviews', path: '/reviews', icon: <RateReviewRounded /> },
  { labelKey: 'nav.promotions', path: '/promotions', icon: <LocalOfferRounded /> },
  { labelKey: 'nav.settings', path: '/settings', icon: <SettingsRounded /> },
];

export default function AdminLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const { t } = useLanguage();

  const initials = useMemo(() => {
    const source = admin?.name?.trim() || admin?.login_id || 'AD';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [admin]);

  const handleProfileClick = (event: MouseEvent<HTMLElement>) => setProfileAnchor(event.currentTarget);
  const handleLogout = () => {
    setProfileAnchor(null);
    logout();
    navigate('/login', { replace: true });
  };

  const navList = (items: NavItem[]) => (
    <List disablePadding sx={{ px: 1.5 }}>
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            sx={{
              mb: 0.6,
              minHeight: 45,
              borderRadius: 2.5,
              color: active ? '#FFFFFF' : '#A9AFB5',
              backgroundColor: active ? 'rgba(253,71,60,0.14)' : 'transparent',
              '&:hover': { backgroundColor: active ? 'rgba(253,71,60,0.18)' : 'rgba(255,255,255,0.05)' },
              '&::before': active
                ? { content: '""', width: 3, height: 22, background: '#FD473C', borderRadius: 99, position: 'absolute', left: 0 }
                : undefined,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: active ? '#FD473C' : '#7F878E' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={t(item.labelKey)} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 750 : 600 }} />
          </ListItemButton>
        );
      })}
    </List>
  );

  const drawer = (
    <Box sx={{ height: '100%', background: '#22292F', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2.7, display: 'flex', alignItems: 'center', gap: 1.35 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '11px', display: 'grid', placeItems: 'center', background: '#FD473C', fontWeight: 900, fontSize: 20 }}>N</Box>
        <Box>
          <Typography sx={{ fontSize: 17, lineHeight: 1.05, fontWeight: 800 }}>Ninimum</Typography>
          <Typography sx={{ mt: 0.35, fontSize: 11.5, color: '#858D94', fontWeight: 650 }}>ADMIN PANEL</Typography>
        </Box>
      </Box>

      <Typography sx={{ px: 3, mb: 1, color: '#697178', fontSize: 10.5, fontWeight: 800, letterSpacing: 1.25 }}>{t('nav.management')}</Typography>
      {navList(primaryItems)}

      <Divider sx={{ mx: 2.5, my: 2.2, borderColor: 'rgba(255,255,255,0.08)' }} />
      <Typography sx={{ px: 3, mb: 1, color: '#697178', fontSize: 10.5, fontWeight: 800, letterSpacing: 1.25 }}>{t('nav.system')}</Typography>
      {navList(secondaryItems)}

      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ m: 2, p: 1.6, borderRadius: 3, background: 'rgba(255,255,255,0.045)' }}>
        <Box display="flex" alignItems="center" gap={1.2}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#FD473C', fontSize: 13, fontWeight: 800 }}>{initials}</Avatar>
          <Box minWidth={0}>
            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 750 }}>{admin?.name || t('header.adminRole')}</Typography>
            <Typography noWrap sx={{ fontSize: 11, color: '#818990' }}>{admin?.login_id}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? drawerWidth : undefined,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0 },
        }}
      >
        {drawer}
      </Drawer>

      <Box sx={{ ml: isDesktop ? `${drawerWidth}px` : 0 }}>
        <Box
          component="header"
          sx={{
            height: 78,
            px: { xs: 2, md: 3.5 },
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid',
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          {!isDesktop && <IconButton onClick={() => setMobileOpen(true)}><MenuRounded /></IconButton>}

          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: { xs: 'none', md: 'block' } }}><LanguageSelector /></Box>

          <Tooltip title={t('header.notifications')}>
            <IconButton sx={{ bgcolor: '#F7F8FB', border: '1px solid #ECEDEF' }}><NotificationsNoneRounded /></IconButton>
          </Tooltip>

          <Box sx={{ display: { xs: 'none', sm: 'block' }, cursor: 'pointer' }} onClick={handleProfileClick}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 750 }}>{admin?.name || t('header.adminRole')}</Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{admin?.role || 'ADMIN'}</Typography>
          </Box>
          <Avatar onClick={handleProfileClick} sx={{ width: 38, height: 38, bgcolor: '#22292F', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{initials}</Avatar>

          <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
              {t('common.logout')}
            </MenuItem>
          </Menu>
        </Box>

        <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1600, mx: 'auto' }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
