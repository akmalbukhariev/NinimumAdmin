import { useEffect, useRef, useState } from 'react';
import MuiTextField, { type TextFieldProps } from '@mui/material/TextField';
import { useLanguage } from '../i18n/LanguageProvider';

const emptyValue = (value: unknown) => value === '' || value === null || (typeof value === 'string' && !value.trim());

/**
 * The web admin's text field. A `required` field shows "*" in its label (MUI) and turns red with
 * "Majburiy maydon" once it is left empty: after the user leaves it, or after a click on the dialog's
 * buttons row (a disabled Save button lets the click through to that row).
 */
export function TextField(props: TextFieldProps) {
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
    onBlur={e => { setTouched(true); onBlur?.(e); }} />;
}

export default TextField;
