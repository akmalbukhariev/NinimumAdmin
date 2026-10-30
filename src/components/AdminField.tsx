import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import MuiTextField, { type TextFieldProps } from '@mui/material/TextField';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import { useLanguage } from '../i18n/LanguageProvider';
import { CalendarPopover, MONTHS } from './CalendarPopover';

const emptyValue = (value: unknown) => value === '' || value === null || (typeof value === 'string' && !value.trim());

/**
 * A `required` field shows "*" in its label (MUI) and turns red with "Majburiy maydon" once it is left
 * empty: after the user leaves it, or after a click on the dialog's buttons row (a disabled Save button
 * lets the click through to that row). holdCheck pauses this while the calendar is open.
 */
function PlainField({ holdCheck, ...props }: TextFieldProps & { holdCheck?: boolean }) {
  const { language } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState(false);
  const { required, disabled, value, error, helperText, onBlur } = props;
  useEffect(() => {
    if (!required) return;
    const root = ref.current?.closest('.MuiDialog-root');
    if (!root) return;
    const mark = (e: Event) => { if ((e.target as Element | null)?.closest?.('.MuiDialogActions-root')) setTouched(true); };
    root.addEventListener('pointerdown', mark, true);
    return () => root.removeEventListener('pointerdown', mark, true);
  }, [required]);
  const missing = !!required && !disabled && touched && emptyValue(value);
  const text = language === 'ru' ? 'Обязательное поле' : language === 'en' ? 'Required field' : 'Majburiy maydon';
  return <MuiTextField {...props} ref={ref} error={error || missing} helperText={missing ? text : helperText}
    onBlur={e => { if (!holdCheck) setTouched(true); onBlur?.(e); }} />;
}

const realDate = (y: number, m: number, d: number) => { const date = new Date(Date.UTC(y, m - 1, d)); return date.getUTCMonth() === m - 1 && date.getUTCDate() === d; };

/** Date (yyyy-mm-dd) or month (yyyy-mm) field. Shows dd.mm.yyyy, can be typed, and opens the site's calendar. */
function DateField({ type, value, onChange, slotProps, ...props }: TextFieldProps) {
  const { language } = useLanguage();
  const monthOnly = type === 'month';
  const iso = String(value ?? '');
  const [draft, setDraft] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const send = (next: string) => onChange?.({ target: { value: next } } as ChangeEvent<HTMLInputElement>);
  const shown = monthOnly
    ? (/^\d{4}-\d{2}/.test(iso) ? `${MONTHS[language][Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : '')
    : (/^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '');
  const type8 = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    if (!digits) { setDraft(null); send(''); return; }
    const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4);
    if (digits.length === 8 && realDate(Number(y), Number(m), Number(d))) { setDraft(null); send(`${y}-${m}-${d}`); return; }
    setDraft([d, m, y].filter(Boolean).join('.'));
  };
  return <>
    <PlainField {...props} holdCheck={!!anchor} value={draft ?? shown}
      placeholder={monthOnly ? undefined : language === 'ru' ? 'дд.мм.гггг' : language === 'en' ? 'dd.mm.yyyy' : 'kk.oo.yyyy'}
      onChange={e => { if (!monthOnly) type8(e.target.value); }}
      onClick={e => { if (monthOnly && !props.disabled) setAnchor(e.currentTarget as HTMLElement); }}
      onBlur={e => { setDraft(null); props.onBlur?.(e); }}
      slotProps={{ ...slotProps, inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric', readOnly: monthOnly },
        input: { endAdornment: <InputAdornment position="end"><IconButton edge="end" size="small" disabled={props.disabled} aria-label="calendar" onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); setAnchor(e.currentTarget); }}><CalendarMonthRounded fontSize="small" /></IconButton></InputAdornment> } }} />
    {anchor && <CalendarPopover anchor={anchor} value={iso} monthOnly={monthOnly} onPick={next => { setAnchor(null); setDraft(null); send(next); }} onClose={() => setAnchor(null)} />}
  </>;
}

/** The web admin's text field: every form uses this one, so date fields and required marks work the same everywhere. */
export function TextField(props: TextFieldProps) {
  return props.type === 'date' || props.type === 'month' ? <DateField {...props} /> : <PlainField {...props} />;
}

export default TextField;
