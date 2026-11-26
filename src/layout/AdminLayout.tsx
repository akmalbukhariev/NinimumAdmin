import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  CategoryRounded,
  DashboardRounded,
  DeliveryDiningRounded,
  Inventory2Rounded,
  LogoutRounded,
  KeyRounded,
  MenuRounded,
  PeopleAltRounded,
  AccountBalanceWalletRounded,
  ReceiptLongRounded,
  SettingsRounded,
} from '@mui/icons-material';
import {
  Avatar,
  Backdrop,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { canAccess } from '../auth/permissions';
import { useAuth } from '../auth/AuthProvider';
import { API_ACTIVITY_EVENT } from '../api/client';
import { ProblemBell } from '../components/OrderProblems';
import { useL } from '../components/AdminCommon';
import { staffRoleLabel } from '../components/StaffAccess';
import { OwnPasswordDialog } from '../components/AdminAccount';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/translations';

// SalesDoc-style navigation (owner request 2026-11-26): a narrow dark rail with icon + short label;
// hovering an item opens a dark panel with that section's pages (TZ v13 item 13). Pages the admin
// may not open are left out; a rail item without any page is hidden.
const railWidth = 90;
type L = (uz: string, ru: string, en: string) => string;
type NavLinkItem = { label: (l: L, t: (k: TranslationKey) => string) => string; to: string };
type NavGroup = { key: string; label: (l: L, t: (k: TranslationKey) => string) => string; icon: ReactNode; links: NavLinkItem[] };
const page = (key: TranslationKey, to: string): NavLinkItem => ({ label: (_l, t) => t(key), to });
const tab = (uz: string, ru: string, en: string, to: string): NavLinkItem => ({ label: l => l(uz, ru, en), to });

const navGroups: NavGroup[] = [
  { key: 'dashboard', label: (_l, t) => t('nav.dashboard'), icon: <DashboardRounded />, links: [page('nav.dashboard', '/dashboard')] },
  { key: 'orders', label: (_l, t) => t('nav.orders'), icon: <ReceiptLongRounded />, links: [page('nav.orders', '/orders'), page('nav.problems', '/problems'), page('nav.refunds', '/refunds')] },
  { key: 'warehouse', label: (_l, t) => t('nav.warehouse'), icon: <Inventory2Rounded />, links: [
    tab('Qoldiq', 'Остатки', 'Stock', '/warehouse?tab=0'), tab('Kirimlar', 'Поступления', 'Receipts', '/warehouse?tab=2'),
    tab('Manzillar', 'Ячейки', 'Locations', '/warehouse?tab=1'), tab('Harakat tarixi', 'История движения', 'Movements', '/warehouse?tab=3'),
    tab('Tayyorlash navbati', 'Очередь сборки', 'Packing queue', '/warehouse?tab=4'), tab('Ombor xodimlari', 'Сотрудники склада', 'Warehouse staff', '/warehouse?tab=5'),
    tab('Partiya va qoldiqlar', 'Партии и остатки', 'Batches and stock', '/inventory'), page('nav.suppliers', '/suppliers')] },
  { key: 'products', label: (_l, t) => t('nav.products'), icon: <CategoryRounded />, links: [page('nav.products', '/products'), page('nav.categories', '/categories'), page('nav.promotions', '/promotions'), page('nav.reviews', '/reviews')] },
  { key: 'customers', label: (_l, t) => t('nav.customers'), icon: <PeopleAltRounded />, links: [page('nav.customers', '/customers'), page('nav.subscriptions', '/subscriptions')] },
  { key: 'delivery', label: l => l('Yetkazish', 'Доставка', 'Delivery'), icon: <DeliveryDiningRounded />, links: [page('nav.delivery', '/delivery'), page('nav.courierMap', '/courier-map')] },
  { key: 'finance', label: (_l, t) => t('nav.finance'), icon: <AccountBalanceWalletRounded />, links: [page('nav.finance', '/finance'), page('nav.reports', '/reports')] },
  { key: 'settings', label: (_l, t) => t('nav.settings'), icon: <SettingsRounded />, links: [page('nav.settings', '/settings')] },
];
const topLinks: [TranslationKey, string][] = [['nav.dashboard', '/dashboard'], ['nav.orders', '/orders'], ['nav.problems', '/problems'], ['nav.finance', '/finance'], ['nav.reports', '/reports'], ['nav.courierMap', '/courier-map']];
const pathOf = (to: string) => to.split('?')[0];

export default function AdminLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout, accessToken } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const l = useL();
  const { t } = useLanguage();
  const [backendBusy, setBackendBusy] = useState(false);
  const backendBusyHideTimer = useRef<number | null>(null);

  useEffect(() => {
    const handleActivity = (event: Event) => {
      const count = Number((event as CustomEvent<number>).detail || 0);
      if (backendBusyHideTimer.current !== null) {
        window.clearTimeout(backendBusyHideTimer.current);
        backendBusyHideTimer.current = null;
      }

      if (count > 0) {
        setBackendBusy(true);
        return;
      }

      // A very small delay prevents flicker when one save action performs
      // several backend calls in sequence (for example product + images).
      backendBusyHideTimer.current = window.setTimeout(() => {
        setBackendBusy(false);
        backendBusyHideTimer.current = null;
      }, 180);
    };

    window.addEventListener(API_ACTIVITY_EVENT, handleActivity);
    return () => {
      window.removeEventListener(API_ACTIVITY_EVENT, handleActivity);
      if (backendBusyHideTimer.current !== null) window.clearTimeout(backendBusyHideTimer.current);
    };
  }, []);

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

  const groups = navGroups.map(g => ({ ...g, links: g.links.filter(x => canAccess(admin, pathOf(x.to))) })).filter(g => g.links.length);
  const isActive = (to: string) => location.pathname === pathOf(to) && (!to.includes('?') || location.search.replace(/^\?/, '').split('&').includes(to.split('?')[1]) || (to.endsWith('tab=0') && !location.search.includes('tab=')));
  const groupActive = (g: NavGroup) => g.links.some(x => location.pathname === pathOf(x.to));
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // Where the hovered rail item is on screen: the panel opens next to it, not at the top.
  const [anchor, setAnchor] = useState<{ top: number; bottom: number }>({ top: 48, bottom: 48 });
  const closeTimer = useRef<number | null>(null);
  const hoverGroup = (key: string | null, item?: HTMLElement) => {
    if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (item) { const r = item.getBoundingClientRect(); setAnchor({ top: r.top, bottom: r.bottom }); }
    if (key) setOpenGroup(key); else closeTimer.current = window.setTimeout(() => setOpenGroup(null), 150);
  };
  useEffect(() => { setOpenGroup(null); setMobileOpen(false); }, [location.pathname, location.search]);

  const panelLink = (x: NavLinkItem) => (
    <Box key={x.to} component={NavLink} to={x.to} sx={{ display: 'block', px: 2, py: 1.1, color: isActive(x.to) ? '#4DB6AC' : '#FFFFFF', textDecoration: 'none', fontSize: 14.5, whiteSpace: 'nowrap', '&:hover': { color: '#4DB6AC' } }}>
      {x.label(l, t)}
    </Box>
  );

  const rail = (
    <Box component="nav" sx={{ position: 'fixed', top: 48, left: 0, bottom: 0, width: railWidth, bgcolor: '#263238', zIndex: 30, overflowY: 'auto', overflowX: 'visible', pt: 0.5 }}>
      {groups.map(g => {
        const single = g.links.length === 1;
        const active = groupActive(g);
        return <Box key={g.key} onMouseEnter={e => hoverGroup(single ? null : g.key, e.currentTarget as HTMLElement)} onMouseLeave={() => hoverGroup(null)}
          component={NavLink} to={g.links[0].to}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, py: 1.1, px: 0.5, textDecoration: 'none', textAlign: 'center',
            color: active ? '#4DB6AC' : '#FFFFFF', bgcolor: openGroup === g.key ? 'rgba(255,255,255,0.08)' : active ? 'rgba(0,150,136,0.18)' : 'transparent',
            borderLeft: '3px solid', borderLeftColor: active ? '#009688' : 'transparent',
            '& svg': { fontSize: 28 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
          {g.icon}
          <Typography sx={{ fontSize: 12, lineHeight: 1.15, fontWeight: 500 }}>{g.label(l, t)}</Typography>
        </Box>;
      })}
    </Box>
  );

  const flyoutGroup = groups.find(g => g.key === openGroup);
  const flyoutRows = flyoutGroup ? (flyoutGroup.links.length > 5 ? Math.ceil(flyoutGroup.links.length / 2) : flyoutGroup.links.length) : 0;
  // Opens level with the hovered item; when it would run past the bottom of the screen it grows upwards from the item instead.
  const flyoutHeight = flyoutRows * 41 + 16;
  const flyoutPlace = anchor.top + flyoutHeight <= window.innerHeight - 8
    ? { top: anchor.top }
    : { bottom: Math.max(8, window.innerHeight - anchor.bottom) };
  const flyout = flyoutGroup && flyoutGroup.links.length > 1 && (
    <Box onMouseEnter={() => hoverGroup(flyoutGroup.key)} onMouseLeave={() => hoverGroup(null)}
      sx={{ position: 'fixed', ...flyoutPlace, left: railWidth, maxHeight: 'calc(100vh - 56px)', overflowY: 'auto', zIndex: 40,
        bgcolor: '#2F3B42', boxShadow: '6px 6px 18px rgba(0,0,0,0.25)', py: 1,
        // Two columns filled top to bottom, like SalesDoc, when a section has more than 5 pages.
        display: 'grid', gridAutoFlow: 'column', gridTemplateRows: `repeat(${flyoutRows}, auto)`,
        '& > a:nth-of-type(n)': { borderRight: '1px solid rgba(255,255,255,0.06)' } }}>
      {flyoutGroup.links.map(panelLink)}
    </Box>
  );

  const mobileMenu = (
    <Box sx={{ height: '100%', bgcolor: '#263238', color: '#fff', overflowY: 'auto', pb: 2 }}>
      <Box sx={{ p: 2 }}><LanguageSelector dark /></Box>
      {groups.map(g => <Box key={g.key} sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1, color: '#90A4AE', '& svg': { fontSize: 20 } }}>{g.icon}<Typography sx={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{g.label(l, t)}</Typography></Box>
        {g.links.map(x => <Box key={x.to} component={NavLink} to={x.to} sx={{ display: 'block', pl: 6, pr: 2, py: 1.1, color: isActive(x.to) ? '#4DB6AC' : '#FFFFFF', textDecoration: 'none', fontSize: 15 }}>{x.label(l, t)}</Box>)}
      </Box>)}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box component="header" sx={{ height: 48, px: { xs: 1, md: 1.5 }, display: 'flex', alignItems: 'center', gap: { xs: 0.75, md: 1.5 }, bgcolor: '#263238', color: '#fff', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        {!isDesktop && <IconButton aria-label="Open menu" onClick={() => setMobileOpen(true)} sx={{ color: '#fff' }}><MenuRounded /></IconButton>}
        <Box component={NavLink} to="/dashboard" sx={{ width: 38, height: 38, borderRadius: '9px', display: 'grid', placeItems: 'center', bgcolor: '#FD473C', color: '#fff', fontWeight: 900, fontSize: 20, textDecoration: 'none', ml: { lg: '14px' }, mr: { lg: 2.5 }, flexShrink: 0 }}>N</Box>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, minWidth: 0, overflow: 'hidden' }}>
          {topLinks.filter(([, to]) => canAccess(admin, to)).map(([key, to]) => <Box key={to} component={NavLink} to={to}
            sx={{ px: 1.25, py: 0.75, borderRadius: 1, color: location.pathname === to ? '#4DB6AC' : '#FFFFFF', textDecoration: 'none', fontSize: 14.5, whiteSpace: 'nowrap', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>{t(key)}</Box>)}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: { xs: 'none', md: 'block' } }}><LanguageSelector dark /></Box>
        <Tooltip title={t('header.notifications')}>
          <Box><ProblemBell/></Box>
        </Tooltip>
        <Box onClick={handleProfileClick} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', pl: 0.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#546E7A', fontSize: 12.5, fontWeight: 700 }}>{initials}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{admin?.name || t('header.adminRole')}</Typography>
            <Typography sx={{ fontSize: 11, color: '#B0BEC5' }}>{staffRoleLabel(l, admin?.staff_role, admin?.role)}</Typography>
          </Box>
        </Box>
        <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <MenuItem disabled sx={{ opacity: '1!important', display: 'block' }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 750 }}>{admin?.name || admin?.login_id}</Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Login: {admin?.login_id} · {staffRoleLabel(l, admin?.staff_role, admin?.role)}</Typography>
          </MenuItem>
          <MenuItem onClick={() => { setProfileAnchor(null); setPasswordOpen(true); }}>
            <ListItemIcon><KeyRounded fontSize="small" /></ListItemIcon>
            {l('Parolni o‘zgartirish', 'Сменить пароль', 'Change password')}
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
            {t('common.logout')}
          </MenuItem>
        </Menu>
        {passwordOpen && accessToken && <OwnPasswordDialog token={accessToken} onClose={() => setPasswordOpen(false)} />}
      </Box>

      {isDesktop ? <>{rail}{flyout}</> : <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: '82vw', maxWidth: 300, border: 0 } }}>{mobileMenu}</Drawer>}

      <Box component="main" sx={{ pt: '48px', pl: isDesktop ? `${railWidth}px` : 0, minWidth: 0 }}>
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, pb: { xs: 5, md: 3 }, width: '100%', minWidth: 0 }}><Outlet /></Box>
      </Box>

      <Backdrop
        open={backendBusy}
        sx={{
          zIndex: (currentTheme) => currentTheme.zIndex.modal + 1000,
          bgcolor: 'rgba(255,255,255,0.78)',
          color: 'text.primary',
          backdropFilter: 'blur(1px)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={52} />
          <Typography sx={{ mt: 2, fontWeight: 800 }}>{t('common.loading')}</Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}
