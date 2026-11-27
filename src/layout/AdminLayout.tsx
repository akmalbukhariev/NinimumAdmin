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
  InsightsRounded,
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
const railWidth = 92;
type L = (uz: string, ru: string, en: string) => string;
type NavLinkItem = { label: (l: L, t: (k: TranslationKey) => string) => string; to: string };
type NavSection = { title: (l: L) => string; links: NavLinkItem[] };
type NavGroup = { key: string; label: (l: L, t: (k: TranslationKey) => string) => string; icon: ReactNode; links: NavLinkItem[]; sections?: NavSection[] };
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
  { key: 'finance', label: (_l, t) => t('nav.finance'), icon: <AccountBalanceWalletRounded />, links: [page('nav.finance', '/finance')] },
  // Owner request 2026-11-27: every report in one menu, in columns by subject (like SalesDoc "Отчёты").
  { key: 'reports', label: l => l('Hisobot', 'Отчёт', 'Report'), icon: <InsightsRounded />, links: [], sections: [
    { title: l => l('Umumiy', 'Общие', 'General'), links: [
      tab('Umumiy hisobot', 'Общий отчёт', 'Overview', '/analytics?view=all'), tab('Tushum va foyda', 'Выручка и прибыль', 'Income and profit', '/analytics?view=money'),
      tab('Xarajatlar', 'Расходы', 'Expenses', '/analytics?view=expenses'), tab('Buyurtmalar', 'Заказы', 'Orders', '/analytics?view=orders'),
      tab('Mijozlar va foydalanuvchilar', 'Клиенты и пользователи', 'Customers and users', '/analytics?view=users'), tab('Sotuv va yalpi foyda', 'Продажи и валовая прибыль', 'Sales and gross profit', '/reports?code=sales'),
      tab('Obunalar', 'Подписки', 'Subscriptions', '/reports?code=subscriptions')] },
    { title: l => l('Xodimlar', 'Сотрудники', 'Employees'), links: [
      tab('Xodimlar samaradorligi', 'Эффективность сотрудников', 'Employee performance', '/analytics?view=staff'), tab('Kuryerlar ishi', 'Работа курьеров', 'Couriers', '/analytics?view=couriers'),
      tab('Omborchilar ishi', 'Работа кладовщиков', 'Warehouse workers', '/analytics?view=warehouse'), tab('Administratorlar ishi', 'Работа администраторов', 'Administrators', '/analytics?view=admins'),
      tab('Kuryerlar (yetkazish vaqti)', 'Курьеры (время доставки)', 'Couriers (delivery time)', '/reports?code=couriers')] },
    { title: l => l('Buyurtma nazorati', 'Контроль заказов', 'Order control'), links: [
      tab('Buyurtma oqimi', 'Поток заказов', 'Order flow', '/reports?code=order-flow'), tab('Muammolar va pul nazorati', 'Проблемы и контроль денег', 'Problems and money', '/reports?code=problems'),
      tab('Bekor va qaytarish sabablari', 'Причины отмен и возвратов', 'Cancel and return reasons', '/reports?code=reasons')] },
    { title: l => l('Ombor', 'Склад', 'Warehouse'), links: [
      tab('Qoldiq', 'Остатки', 'Stock', '/reports?code=stock'), tab('Tovar aylanmasi', 'Оборот товара', 'Stock turnover', '/reports?code=turnover'),
      tab('Manzillar bo‘yicha qoldiq', 'Остатки по ячейкам', 'Stock by bin', '/reports?code=bins'), tab('Joylashtirilmagan tovar', 'Неразмещённый товар', 'Goods not put away', '/reports?code=unplaced'),
      tab('Kirimlar va nomuvofiqliklar', 'Приходы и расхождения', 'Receipts and mismatches', '/reports?code=receipts'), tab('Spisaniya', 'Списания', 'Write-offs', '/reports?code=writeoffs'),
      tab('Muddatlar', 'Сроки годности', 'Expiry dates', '/reports?code=expiry'), tab('Sanash natijalari', 'Результаты пересчётов', 'Count results', '/reports?code=counts'),
      tab('Harakatsiz tovar', 'Неликвидный товар', 'Dead stock', '/reports?code=dead-stock'), tab('Tavsiya etilgan zaxira', 'Рекомендуемый запас', 'Suggested stock', '/reports?code=reorder')] },
    { title: l => l('Yetkazib beruvchilar', 'Поставщики', 'Suppliers'), links: [
      tab('To‘lov kalendari', 'Платёжный календарь', 'Payment calendar', '/reports?code=payment-calendar'), tab('Yetkazib beruvchi oboroti', 'Оборот поставщика', 'Supplier turnover', '/reports?code=supplier-turnover')] },
  ] },
  { key: 'settings', label: (_l, t) => t('nav.settings'), icon: <SettingsRounded />, links: [page('nav.settings', '/settings')] },
];
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

  const groups = navGroups.map(g => {
    if (!g.sections) return { ...g, links: g.links.filter(x => canAccess(admin, pathOf(x.to))) };
    // A sectioned menu (Hisobot): keep the pages the user may open; a section left empty disappears.
    const sections = g.sections.map(sec => ({ ...sec, links: sec.links.filter(x => canAccess(admin, pathOf(x.to))) })).filter(sec => sec.links.length);
    return { ...g, sections, links: sections.flatMap(sec => sec.links) };
  }).filter(g => g.links.length);
  const isActive = (to: string) => location.pathname === pathOf(to) && (!to.includes('?') || location.search.replace(/^\?/, '').split('&').includes(to.split('?')[1]) || (to.endsWith('tab=0') && !location.search.includes('tab=')));
  const groupActive = (g: NavGroup) => g.links.some(x => location.pathname === pathOf(x.to) || location.pathname.startsWith(`${pathOf(x.to)}/`));
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // Owner request 2026-11-27: a section's pages open on click (not hover), next to the clicked rail item.
  const [anchor, setAnchor] = useState<{ top: number; bottom: number }>({ top: 60, bottom: 60 });
  const toggleGroup = (key: string, item: HTMLElement) => {
    const r = item.getBoundingClientRect(); setAnchor({ top: r.top, bottom: r.bottom });
    stopClose(); pinned.current = openGroup !== key || !pinned.current;
    setOpenGroup(pinned.current ? key : null);
  };
  // Owner request 2026-11-28: hovering also shows the panel; it closes shortly after the mouse leaves,
  // unless it was opened with a click (then it stays until a click outside or Esc).
  const pinned = useRef(false), closeTimer = useRef<number | null>(null);
  const stopClose = () => { if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const hoverOpen = (key: string | null, item?: HTMLElement) => {
    stopClose();
    if (!key) { if (!pinned.current) setOpenGroup(null); return; }
    if (pinned.current && openGroup && openGroup !== key) pinned.current = false;
    if (item) { const r = item.getBoundingClientRect(); setAnchor({ top: r.top, bottom: r.bottom }); }
    setOpenGroup(key);
  };
  const hoverLeave = () => { stopClose(); if (!pinned.current) closeTimer.current = window.setTimeout(() => setOpenGroup(null), 200); };
  useEffect(() => { setOpenGroup(null); pinned.current = false; setMobileOpen(false); }, [location.pathname, location.search]);
  // Click outside the menu or press Esc → the panel closes.
  useEffect(() => {
    if (!openGroup) return;
    const close = (e: globalThis.MouseEvent) => { const el = e.target as HTMLElement; if (!el.closest('[data-rail]')) { pinned.current = false; setOpenGroup(null); } };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { pinned.current = false; setOpenGroup(null); } };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [openGroup]);

  const panelLink = (x: NavLinkItem) => (
    <Box key={x.to} component={NavLink} to={x.to} sx={{ display: 'block', mx: 1, px: 1.5, py: 1, borderRadius: 2, color: isActive(x.to) ? '#E8453C' : '#1F2233', bgcolor: isActive(x.to) ? '#FFECEA' : 'transparent', fontWeight: isActive(x.to) ? 700 : 500, textDecoration: 'none', fontSize: 14.5, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#FFF3F2', color: '#E8453C' } }}>
      {x.label(l, t)}
    </Box>
  );

  const rail = (
    <Box component="nav" data-rail sx={{ position: 'fixed', top: 60, left: 0, bottom: 0, width: railWidth, bgcolor: '#FFFFFF', borderRight: '1px solid #E6E8EF', zIndex: 30, overflowY: 'auto', overflowX: 'visible', pt: 1, px: 0.75 }}>
      {groups.map(g => {
        const single = g.links.length === 1;
        const active = groupActive(g);
        return <Box key={g.key} component={NavLink} to={g.links[0].to}
          onMouseEnter={(e: MouseEvent<HTMLElement>) => hoverOpen(single ? null : g.key, e.currentTarget)} onMouseLeave={hoverLeave}
          onClick={(e: MouseEvent<HTMLElement>) => { if (single) return; e.preventDefault(); toggleGroup(g.key, e.currentTarget); }}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, py: 1, px: 0.25, mb: 0.5, borderRadius: '14px', textDecoration: 'none', textAlign: 'center',
            color: active ? '#E8453C' : '#6B7085', bgcolor: active ? '#FFECEA' : openGroup === g.key ? '#F5F6FA' : 'transparent',
            '& svg': { fontSize: 25 }, '&:hover': { bgcolor: active ? '#FFECEA' : '#F5F6FA', color: active ? '#E8453C' : '#1F2233' } }}>
          {g.icon}
          <Typography sx={{ fontSize: 11.5, lineHeight: 1.15, fontWeight: active ? 700 : 600 }}>{g.label(l, t)}</Typography>
        </Box>;
      })}
    </Box>
  );

  const flyoutGroup = groups.find(g => g.key === openGroup);
  const flyoutRows = !flyoutGroup ? 0 : flyoutGroup.sections ? Math.max(...flyoutGroup.sections.map(sec => sec.links.length)) + 1 : flyoutGroup.links.length > 5 ? Math.ceil(flyoutGroup.links.length / 2) : flyoutGroup.links.length;
  // Opens level with the hovered item; when it would run past the bottom of the screen it grows upwards from the item instead.
  const flyoutHeight = flyoutRows * 42 + 60;
  const flyoutPlace = anchor.top + flyoutHeight <= window.innerHeight - 8
    ? { top: anchor.top }
    : { bottom: Math.max(8, window.innerHeight - anchor.bottom) };
  const flyout = flyoutGroup && flyoutGroup.links.length > 1 && (
    <Box data-rail onMouseEnter={stopClose} onMouseLeave={hoverLeave}
      sx={{ position: 'fixed', ...flyoutPlace, left: railWidth + 6, maxHeight: 'calc(100vh - 72px)', maxWidth: `calc(100vw - ${railWidth + 20}px)`, overflow: 'auto', zIndex: 40,
        bgcolor: '#FFFFFF', border: '1px solid #E6E8EF', borderRadius: '14px', boxShadow: '0 12px 32px rgba(31,34,51,0.14)', py: 1.25 }}>
      <Typography sx={{ px: 2.5, pb: 1, fontSize: 12, fontWeight: 800, color: '#6B7085', textTransform: 'uppercase', letterSpacing: 0.8 }}>{flyoutGroup.label(l, t)}</Typography>
      {/* Two columns filled top to bottom when a section has more than 5 pages. */}
      {flyoutGroup.sections
        ? <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>{flyoutGroup.sections.map((sec, i) => <Box key={i} sx={{ minWidth: 200, borderLeft: i ? '1px solid #EEF0F4' : 0, pt: 0.25 }}>
            <Typography sx={{ px: 2.5, py: 0.75, fontSize: 13, fontWeight: 800, color: '#E8453C' }}>{sec.title(l)}</Typography>
            {sec.links.map(panelLink)}
          </Box>)}</Box>
        : <Box sx={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: `repeat(${flyoutRows}, auto)`, columnGap: 0.5 }}>{flyoutGroup.links.map(panelLink)}</Box>}
    </Box>
  );

  const mobileMenu = (
    <Box sx={{ height: '100%', bgcolor: '#FFFFFF', overflowY: 'auto', pb: 2 }}>
      <Box sx={{ p: 2 }}><LanguageSelector /></Box>
      {groups.map(g => <Box key={g.key} sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1, color: '#6B7085', '& svg': { fontSize: 20 } }}>{g.icon}<Typography sx={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{g.label(l, t)}</Typography></Box>
        {g.links.map(x => <Box key={x.to} component={NavLink} to={x.to} sx={{ display: 'block', pl: 6, pr: 2, py: 1.1, color: isActive(x.to) ? '#E8453C' : '#1F2233', fontWeight: isActive(x.to) ? 700 : 500, textDecoration: 'none', fontSize: 15 }}>{x.label(l, t)}</Box>)}
      </Box>)}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box component="header" sx={{ height: 60, px: { xs: 1, md: 2 }, display: 'flex', alignItems: 'center', gap: { xs: 0.75, md: 1.5 }, bgcolor: '#FFFFFF', borderBottom: '1px solid #E6E8EF', color: 'text.primary', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        {!isDesktop && <IconButton aria-label={l('Menyuni ochish', 'Открыть меню', 'Open menu')} onClick={() => setMobileOpen(true)}><MenuRounded /></IconButton>}
        {/* Ninimum's own header: brand mark + name; the pages live only in the left menu (no duplicate links here). */}
        <Box component={NavLink} to="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 1.1, textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg, #F2564C 0%, #D7372E 100%)', color: '#fff', fontWeight: 900, fontSize: 20, boxShadow: '0 4px 10px rgba(232,69,60,0.35)' }}>N</Box>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.1 }}>ninimum</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', lineHeight: 1.2 }}>{l('Boshqaruv paneli', 'Панель управления', 'Admin panel')}</Typography>
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: { xs: 'none', md: 'block' } }}><LanguageSelector /></Box>
        <Tooltip title={t('header.notifications')}>
          <Box><ProblemBell/></Box>
        </Tooltip>
        <Box onClick={handleProfileClick} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', pl: 0.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#2D3142', fontSize: 13, fontWeight: 700 }}>{initials}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.1 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{admin?.name || t('header.adminRole')}</Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{staffRoleLabel(l, admin?.staff_role, admin?.role)}</Typography>
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

      <Box component="main" sx={{ pt: '60px', pl: isDesktop ? `${railWidth}px` : 0, minWidth: 0 }}>
        <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, pb: { xs: 5, md: 4 }, width: '100%', minWidth: 0, maxWidth: 1680, mx: 'auto' }}><Outlet /></Box>
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
