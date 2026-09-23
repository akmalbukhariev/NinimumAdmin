import {
  AddRounded,
  ArrowForwardRounded,
  AttachMoneyRounded,
  GroupsRounded,
  Inventory2Outlined,
  MoreHorizRounded,
  ReceiptLongOutlined,
  WorkspacePremiumOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/adminApi';
import type { DashboardData, DashboardOrderStatus } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import StatCard from '../components/StatCard';
import { useLanguage } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/translations';

const statusColors: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: '#FFF6E8', color: '#B97108' },
  CONFIRMED: { bg: '#FFF6E8', color: '#B97108' },
  PREPARING: { bg: '#FFF6E8', color: '#B97108' },
  ACCEPTED: { bg: '#FFF6E8', color: '#B97108' },
  ON_THE_WAY: { bg: '#EAF4FF', color: '#3975AF' },
  DELIVERED: { bg: '#F0F8E6', color: '#5F8E14' },
  CANCELLED: { bg: '#FFF0EF', color: '#D53D34' },
};

function normalizeNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function groupStatuses(statuses: DashboardOrderStatus[]) {
  const grouped = { preparing: 0, delivered: 0, onTheWay: 0, cancelled: 0 };

  statuses.forEach((item) => {
    const count = normalizeNumber(item.count);
    if (item.status === 'DELIVERED') grouped.delivered += count;
    else if (item.status === 'ON_THE_WAY') grouped.onTheWay += count;
    else if (item.status === 'CANCELLED') grouped.cancelled += count;
    else grouped.preparing += count;
  });

  return grouped;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const { t, locale } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(false);
    try {
      const result = await getDashboard(accessToken);
      setData(result);
    } catch (err: unknown) {
      const maybeCode = err && typeof err === 'object' && 'resultCode' in err ? String((err as { resultCode?: string }).resultCode ?? '') : '';
      if (maybeCode === '200' || maybeCode === '201' || maybeCode === '250' || maybeCode === '253') {
        logout();
        navigate('/login', { replace: true });
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, logout, navigate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const formatNumber = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(normalizeNumber(value));
  const formatMoney = (value: number, compact = false) => {
    const formatted = new Intl.NumberFormat(locale, compact
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 }).format(normalizeNumber(value));
    return `${formatted} ${t('common.uzs')}`;
  };

  const sales = useMemo(() => {
    const source = new Map((data?.sales_last_7_days ?? []).map((item) => [item.sales_date, normalizeNumber(item.total)]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return {
        key,
        label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
        total: source.get(key) ?? 0,
      };
    });
  }, [data, locale]);

  const maxSales = Math.max(...sales.map((item) => item.total), 1);
  const groupedStatuses = groupStatuses(data?.order_status_today ?? []);
  const todayOrderTotal = groupedStatuses.preparing + groupedStatuses.delivered + groupedStatuses.onTheWay + groupedStatuses.cancelled;
  const percentages = {
    preparing: todayOrderTotal ? (groupedStatuses.preparing / todayOrderTotal) * 100 : 0,
    delivered: todayOrderTotal ? (groupedStatuses.delivered / todayOrderTotal) * 100 : 0,
    onTheWay: todayOrderTotal ? (groupedStatuses.onTheWay / todayOrderTotal) * 100 : 0,
  };
  const preparingEnd = percentages.preparing;
  const deliveredEnd = preparingEnd + percentages.delivered;
  const onTheWayEnd = deliveredEnd + percentages.onTheWay;
  const donutBackground = todayOrderTotal
    ? `conic-gradient(#FD473C 0 ${preparingEnd}%, #7CB518 ${preparingEnd}% ${deliveredEnd}%, #3D7CF4 ${deliveredEnd}% ${onTheWayEnd}%, #D9D9D9 ${onTheWayEnd}% 100%)`
    : '#E8E9ED';

  if (loading && !data) {
    return <Box sx={{ minHeight: 520, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <>
      <Box display="flex" alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">{t('dashboard.title')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.6, fontSize: 14 }}>{t('dashboard.welcome')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => navigate('/products')} sx={{ px: 2.2, py: 1.05 }}>
          {t('dashboard.addProduct')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2.5 }} action={<Button color="inherit" size="small" onClick={() => void loadDashboard()}>{t('common.retry')}</Button>}>
          {t('dashboard.error')}
        </Alert>
      )}

      {data && (
        <>
          <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' } }}>
            <StatCard title={t('dashboard.revenue')} value={formatMoney(data.summary.revenue, true)} caption={t('common.allTime')} icon={<AttachMoneyRounded />} accent="#FD473C" />
            <StatCard title={t('dashboard.orders')} value={formatNumber(data.summary.order_count)} caption={t('common.allTime')} icon={<ReceiptLongOutlined />} accent="#3D7CF4" />
            <StatCard title={t('dashboard.customers')} value={formatNumber(data.summary.customer_count)} caption={t('common.total')} icon={<GroupsRounded />} accent="#7CB518" />
            <StatCard title={t('dashboard.subscriptions')} value={formatNumber(data.summary.subscription_count)} caption={t('common.activeNow')} icon={<WorkspacePremiumOutlined />} accent="#9A62E8" />
          </Box>

          <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: '1.65fr 1fr' } }}>
            <Paper elevation={0} sx={{ p: 2.6, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box>
                  <Typography variant="h6">{t('dashboard.salesOverview')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>{t('dashboard.salesSubtitle')}</Typography>
                </Box>
                <Button size="small" variant="outlined" sx={{ color: 'text.primary', borderColor: 'divider' }}>{t('dashboard.last7Days')}</Button>
              </Box>

              <Box sx={{ mt: 3.2, height: 250, display: 'flex', alignItems: 'flex-end', gap: { xs: 1.2, sm: 2.2 } }}>
                {sales.map((item, index) => {
                  const height = item.total <= 0 ? 3 : Math.max((item.total / maxSales) * 100, 8);
                  return (
                    <Box key={item.key} sx={{ flex: 1, minWidth: 0, textAlign: 'center' }} title={formatMoney(item.total)}>
                      <Box sx={{ height: 205, display: 'flex', alignItems: 'flex-end' }}>
                        <Box
                          sx={{
                            height: `${height}%`,
                            width: '100%',
                            maxWidth: 44,
                            mx: 'auto',
                            borderRadius: '8px 8px 3px 3px',
                            background: index === 6 ? 'linear-gradient(180deg, #FD473C 0%, #FF756D 100%)' : 'linear-gradient(180deg, #FFE4E2 0%, #FFF2F1 100%)',
                            position: 'relative',
                            '&::after': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderRadius: 99, backgroundColor: index === 6 ? '#E73C32' : '#FFC9C5' },
                          }}
                        />
                      </Box>
                      <Typography sx={{ mt: 1.2, color: 'text.secondary', fontSize: 11.5, fontWeight: 650 }}>{item.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.6, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{t('dashboard.orderStatus')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>{t('dashboard.todayOrders')}: {formatNumber(todayOrderTotal)}</Typography>
                </Box>
                <IconButton size="small"><MoreHorizRounded /></IconButton>
              </Box>

              <Box sx={{ mt: 3.2, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ width: 165, height: 165, borderRadius: '50%', background: donutBackground, display: 'grid', placeItems: 'center' }}>
                  <Box sx={{ width: 112, height: 112, borderRadius: '50%', bgcolor: '#FFFFFF', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                    <Box>
                      <Typography sx={{ fontSize: 27, fontWeight: 850, lineHeight: 1 }}>{formatNumber(todayOrderTotal)}</Typography>
                      <Typography sx={{ mt: 0.5, fontSize: 11.5, color: 'text.secondary' }}>{t('dashboard.totalOrders')}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 3.2, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1.6 }}>
                {[
                  [t('dashboard.status.preparing'), '#FD473C', groupedStatuses.preparing],
                  [t('dashboard.status.delivered'), '#7CB518', groupedStatuses.delivered],
                  [t('dashboard.status.onTheWay'), '#3D7CF4', groupedStatuses.onTheWay],
                  [t('dashboard.status.cancelled'), '#D9D9D9', groupedStatuses.cancelled],
                ].map(([label, color, count]) => (
                  <Box key={String(label)} display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 99, bgcolor: String(color) }} />
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{String(label)}</Typography>
                    <Typography sx={{ ml: 'auto', pr: 1, fontSize: 12.5, fontWeight: 800 }}>{formatNumber(Number(count))}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: '1.7fr 0.95fr' } }}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Box sx={{ p: 2.6, pb: 1.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">{t('dashboard.recentOrders')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>{t('dashboard.recentOrdersSubtitle')}</Typography>
                </Box>
                <Button endIcon={<ArrowForwardRounded />} size="small" onClick={() => navigate('/orders')}>{t('dashboard.viewAll')}</Button>
              </Box>

              {data.recent_orders.length === 0 ? (
                <Typography color="text.secondary" sx={{ p: 3, pt: 1 }}>{t('common.noData')}</Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#FBFBFC' }}>
                        {[t('dashboard.order'), t('dashboard.customer'), t('dashboard.amount'), t('dashboard.status'), t('dashboard.time'), ''].map((head) => (
                          <TableCell key={head} sx={{ py: 1.2, color: 'text.secondary', fontSize: 11, fontWeight: 800, borderColor: 'divider' }}>{head.toUpperCase()}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.recent_orders.map((order) => {
                        const statusStyle = statusColors[order.status] ?? { bg: '#F1F2F4', color: '#697178' };
                        const statusKey = `status.${order.status}` as TranslationKey;
                        return (
                          <TableRow key={order.order_id} hover>
                            <TableCell sx={{ py: 1.45, fontSize: 13, fontWeight: 800, borderColor: 'divider' }}>{order.order_number}</TableCell>
                            <TableCell sx={{ py: 1.45, fontSize: 13, borderColor: 'divider' }}>{order.customer_name || '-'}</TableCell>
                            <TableCell sx={{ py: 1.45, fontSize: 13, fontWeight: 700, borderColor: 'divider' }}>{formatMoney(order.total_price)}</TableCell>
                            <TableCell sx={{ py: 1.45, borderColor: 'divider' }}>
                              <Chip size="small" label={t(statusKey)} sx={{ height: 25, bgcolor: statusStyle.bg, color: statusStyle.color, fontSize: 11 }} />
                            </TableCell>
                            <TableCell sx={{ py: 1.45, fontSize: 12, color: 'text.secondary', borderColor: 'divider' }}>
                              {order.ordered_at ? new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.ordered_at.replace(' ', 'T'))) : '-'}
                            </TableCell>
                            <TableCell sx={{ py: 1.45, borderColor: 'divider' }}><IconButton size="small"><MoreHorizRounded fontSize="small" /></IconButton></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: 2.6, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{t('dashboard.lowStock')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>{t('dashboard.lowStockSubtitle')}</Typography>
                </Box>
                <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 2.5, bgcolor: '#FFF1F0', color: '#FD473C' }}>
                  <Inventory2Outlined fontSize="small" />
                </Box>
              </Box>

              <Box sx={{ mt: 2.6 }}>
                {data.low_stock_products.length === 0 ? (
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>{t('common.noData')}</Typography>
                ) : data.low_stock_products.map((item, index) => {
                  const stock = normalizeNumber(item.stock_quantity);
                  const percentage = Math.min(Math.max((stock / 20) * 100, stock > 0 ? 6 : 0), 100);
                  return (
                    <Box key={item.product_id} sx={{ mb: index === data.low_stock_products.length - 1 ? 0 : 2.4 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.product_name}</Typography>
                        <Typography sx={{ fontSize: 12, color: stock < 10 ? '#D53D34' : '#B97108', fontWeight: 800 }}>{formatNumber(stock)} {t('dashboard.left')}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={percentage} sx={{ mt: 1, height: 6, borderRadius: 99, bgcolor: '#F1F2F4', '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: stock < 10 ? '#FD473C' : '#F7A928' } }} />
                    </Box>
                  );
                })}
              </Box>

              <Button fullWidth variant="outlined" onClick={() => navigate('/products')} sx={{ mt: 3, color: 'text.primary', borderColor: 'divider' }}>{t('dashboard.viewInventory')}</Button>
            </Paper>
          </Box>
        </>
      )}
    </>
  );
}
