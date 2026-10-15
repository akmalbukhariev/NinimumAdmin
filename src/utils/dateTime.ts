/** Database timestamps without an offset use the backend's UTC convention. */
export function dateTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === 'number' || /^\d{10,13}$/.test(String(value).trim())) {
    const epoch = Number(value);
    date = new Date(Math.abs(epoch) < 100_000_000_000 ? epoch * 1000 : epoch);
  } else {
    let raw = String(value).trim().replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) raw += 'T00:00:00';
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/i.test(raw)) return '—';
    date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`);
  }
  if (!Number.isFinite(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('day')}.${part('month')}.${part('year')} ${part('hour')}:${part('minute')}`;
}
