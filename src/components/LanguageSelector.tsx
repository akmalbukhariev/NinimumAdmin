import { LanguageRounded } from '@mui/icons-material';
import { FormControl, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Language } from '../i18n/translations';

interface LanguageSelectorProps {
  dark?: boolean;
}

export default function LanguageSelector({ dark = false }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  const handleChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as Language);
  };

  return (
    <FormControl size="small">
      <Select
        value={language}
        onChange={handleChange}
        startAdornment={<LanguageRounded sx={{ mr: 0.8, fontSize: 18, color: dark ? '#C8CDD1' : '#697178' }} />}
        sx={{
          minWidth: 136,
          height: 38,
          fontSize: 12.5,
          fontWeight: 700,
          color: dark ? '#FFFFFF' : 'text.primary',
          bgcolor: dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? 'rgba(255,255,255,0.12)' : '#E8E9ED' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: dark ? 'rgba(255,255,255,0.22)' : '#CDD0D5' },
          '& .MuiSvgIcon-root': { color: dark ? '#A8AFB5' : '#697178' },
        }}
      >
        <MenuItem value="uz">{t('language.uz')}</MenuItem>
        <MenuItem value="ru">{t('language.ru')}</MenuItem>
        <MenuItem value="en">{t('language.en')}</MenuItem>
      </Select>
    </FormControl>
  );
}
