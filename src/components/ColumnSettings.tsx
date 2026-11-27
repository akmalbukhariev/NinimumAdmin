import { useState } from 'react';
import { Box, Button, Divider, Menu, MenuItem, Switch, Typography } from '@mui/material';
import TuneRounded from '@mui/icons-material/TuneRounded';
import { useL } from './AdminCommon';

/** One table column the user may show or hide. `fixed` columns are always shown; `hidden` ones start switched off. */
export type ColumnDef = { key: string; label: string; fixed?: boolean; hidden?: boolean };

function read(storageKey: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(`ninimum_columns_${storageKey}`) || '{}') || {}; } catch { return {}; }
}

/**
 * Show/hide table columns (owner request 2026-11-27, like SalesDoc "Настройки").
 * The choice is remembered in this browser per table; nothing is sent to the server.
 */
export function useColumns(storageKey: string, columns: ColumnDef[]) {
  const [chosen, setChosen] = useState<Record<string, boolean>>(() => read(storageKey));
  const shown = (key: string) => {
    const column = columns.find(c => c.key === key);
    if (!column || column.fixed) return true;
    return chosen[key] ?? !column.hidden;
  };
  const toggle = (key: string) => setChosen(previous => {
    const next = { ...previous, [key]: !shown(key) };
    try { localStorage.setItem(`ninimum_columns_${storageKey}`, JSON.stringify(next)); } catch { /* private window: kept for this visit only */ }
    return next;
  });
  const reset = () => { setChosen({}); try { localStorage.removeItem(`ninimum_columns_${storageKey}`); } catch { /* ignore */ } };
  const visible = columns.filter(c => shown(c.key));
  return { shown, visible, settings: <ColumnSettingsButton columns={columns} shown={shown} toggle={toggle} reset={reset} /> };
}

function ColumnSettingsButton({ columns, shown, toggle, reset }: { columns: ColumnDef[]; shown: (key: string) => boolean; toggle: (key: string) => void; reset: () => void }) {
  const l = useL();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <>
    <Button variant="outlined" color="secondary" startIcon={<TuneRounded />} onClick={e => setAnchor(e.currentTarget)} sx={{ borderColor: 'divider' }}>
      {l('Sozlamalar', 'Настройки', 'Settings')}
    </Button>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { minWidth: 280, maxHeight: '70vh' } } }}>
      <Typography sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 12, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}>{l('Ustunlarni ko‘rsatish', 'Показать столбцы', 'Show columns')}</Typography>
      {columns.filter(c => !c.fixed).map(c => <MenuItem key={c.key} onClick={() => toggle(c.key)} sx={{ py: 0.25 }}>
        <Switch size="small" checked={shown(c.key)} tabIndex={-1} sx={{ mr: 1 }} />
        <Box component="span" sx={{ fontSize: 14 }}>{c.label}</Box>
      </MenuItem>)}
      <Divider />
      <MenuItem onClick={reset} sx={{ fontSize: 13.5, color: 'text.secondary' }}>{l('Boshlang‘ich holatga qaytarish', 'Сбросить', 'Reset to default')}</MenuItem>
    </Menu>
  </>;
}
