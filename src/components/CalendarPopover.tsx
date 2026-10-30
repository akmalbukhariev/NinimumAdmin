import { useState } from 'react';
import { Box, Button, IconButton, Popover, Stack } from '@mui/material';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { useLanguage } from '../i18n/LanguageProvider';

export const MONTHS = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const DAYS = { uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] };
const TEXT = {
  uz: { clear: 'Tozalash', today: 'Bugun', thisMonth: 'Shu oy' },
  ru: { clear: 'Очистить', today: 'Сегодня', thisMonth: 'Этот месяц' },
  en: { clear: 'Clear', today: 'Today', thisMonth: 'This month' },
};

const two = (n: number) => String(n).padStart(2, '0');
const tashkentToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** The site's own calendar: a browser's date picker follows the browser language, not the site's. value and onPick use yyyy-mm-dd (yyyy-mm when monthOnly). */
export function CalendarPopover({ anchor, value, monthOnly, onPick, onClose }: { anchor: HTMLElement; value: string; monthOnly: boolean; onPick: (value: string) => void; onClose: () => void }) {
  const { language } = useLanguage();
  const today = tashkentToday();
  const start = /^\d{4}-\d{2}/.test(value) ? value : today;
  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)) - 1);
  const [picking, setPicking] = useState(monthOnly);
  const shift = (step: number) => {
    if (picking) { setYear(year + step); return; }
    const next = year * 12 + month + step;
    setYear(Math.floor(next / 12)); setMonth(next % 12);
  };
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cell = { minWidth: 0, p: 0, fontWeight: 500 };
  const look = (selected: boolean, current: boolean) => ({ variant: selected ? 'contained' : current ? 'outlined' : 'text', color: selected || current ? 'primary' : 'inherit' } as const);
  return <Popover open anchorEl={anchor} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
    <Box sx={{ p: 1.5, width: 296 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <IconButton size="small" onClick={() => shift(-1)}><ChevronLeftRounded /></IconButton>
        <Button color="inherit" disabled={monthOnly} onClick={() => setPicking(!picking)} sx={{ fontWeight: 700 }}>{picking ? year : `${MONTHS[language][month]} ${year}`}</Button>
        <IconButton size="small" onClick={() => shift(1)}><ChevronRightRounded /></IconButton>
      </Stack>
      {picking
        ? <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>{MONTHS[language].map((name, i) => {
          const key = `${year}-${two(i + 1)}`;
          return <Button key={name} size="small" {...look(value.slice(0, 7) === key, today.slice(0, 7) === key)} sx={{ ...cell, height: 40 }} onClick={() => { if (monthOnly) onPick(key); else { setMonth(i); setPicking(false); } }}>{name}</Button>;
        })}</Box>
        : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25, textAlign: 'center' }}>
          {DAYS[language].map(name => <Box key={name} sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', py: 0.5 }}>{name}</Box>)}
          {Array.from({ length: offset }, (_, i) => <span key={i} />)}
          {Array.from({ length: days }, (_, i) => {
            const key = `${year}-${two(month + 1)}-${two(i + 1)}`;
            return <Button key={key} size="small" {...look(value.slice(0, 10) === key, today === key)} sx={{ ...cell, height: 36 }} onClick={() => onPick(key)}>{i + 1}</Button>;
          })}
        </Box>}
      <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1 }}>
        <Button size="small" onClick={() => onPick('')}>{TEXT[language].clear}</Button>
        <Button size="small" onClick={() => onPick(monthOnly ? today.slice(0, 7) : today)}>{monthOnly ? TEXT[language].thisMonth : TEXT[language].today}</Button>
      </Stack>
    </Box>
  </Popover>;
}
