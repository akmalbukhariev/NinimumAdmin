import { Box, Stack, Typography } from '@mui/material';
import { useL } from './AdminCommon';

export default function ReturnEvidence({ photo, reason }: { photo?: string | null; reason?: string | null }) {
  const l = useL();
  if (!photo && !reason) return null;
  return <Stack spacing={1} sx={{ my: 2 }}>
    <Typography fontWeight={700}>{l('Qaytarish dalili', 'Подтверждение возврата', 'Return evidence')}</Typography>
    {reason && <Typography>{reason}</Typography>}
    {photo && <Box component="img" src={photo} alt={l('Qaytarish rasmi', 'Фото возврата', 'Return photo')}
      sx={{ width: '100%', maxWidth: 640, maxHeight: 360, objectFit: 'contain', objectPosition: 'left' }} />}
  </Stack>;
}

export async function readReturnPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('RETURN_PHOTO_INVALID');
  if (file.size > 10 * 1024 * 1024) throw new Error('RETURN_PHOTO_TOO_LARGE');
  const source = await createImageBitmap(file);
  try {
    if (source.width * source.height > 24_000_000) throw new Error('RETURN_PHOTO_TOO_LARGE');
    const scale = Math.min(1, 1024 / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('RETURN_PHOTO_INVALID');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  } finally { source.close(); }
}
