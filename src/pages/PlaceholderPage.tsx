import { ConstructionRounded } from '@mui/icons-material';
import { Box, Paper, Typography } from '@mui/material';
import { useLanguage } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/translations';

interface PlaceholderPageProps {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}

export default function PlaceholderPage({ titleKey, descriptionKey }: PlaceholderPageProps) {
  const { t } = useLanguage();

  return (
    <>
      <Typography variant="h4">{t(titleKey)}</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.6, fontSize: 14 }}>{t(descriptionKey)}</Typography>
      <Paper elevation={0} sx={{ mt: 3, minHeight: 480, border: '1px solid', borderColor: 'divider', display: 'grid', placeItems: 'center', textAlign: 'center', p: 4 }}>
        <Box>
          <Box sx={{ width: 64, height: 64, borderRadius: 4, bgcolor: '#FFF0EF', color: '#FD473C', display: 'grid', placeItems: 'center', mx: 'auto' }}>
            <ConstructionRounded sx={{ fontSize: 30 }} />
          </Box>
          <Typography variant="h6" sx={{ mt: 2 }}>{t('placeholder.title')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.8, maxWidth: 500, fontSize: 13.5 }}>{t('placeholder.subtitle')}</Typography>
        </Box>
      </Paper>
    </>
  );
}
