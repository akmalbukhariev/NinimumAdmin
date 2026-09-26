import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string;
  caption: string;
  icon: ReactNode;
  accent: string;
}

export default function StatCard({ title, value, caption, icon, accent }: StatCardProps) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid', borderColor: 'divider', minHeight: { xs: 132, sm: 158 } }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={650}>{title}</Typography>
          <Typography sx={{ mt: 1, fontSize: { xs: 25, sm: 28 }, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</Typography>
        </Box>
        <Box sx={{ width: { xs: 42, sm: 46 }, height: { xs: 42, sm: 46 }, borderRadius: '13px', display: 'grid', placeItems: 'center', color: accent, backgroundColor: `${accent}16` }}>
          {icon}
        </Box>
      </Box>
      <Typography sx={{ mt: { xs: 1.4, sm: 2 }, fontSize: 12.5, color: 'text.secondary', fontWeight: 650 }}>{caption}</Typography>
    </Paper>
  );
}
