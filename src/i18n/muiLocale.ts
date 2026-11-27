import type { ThemeOptions } from '@mui/material/styles';
import type { Language } from './translations';

// MUI's own texts (table paging, "No options", tooltips) in the admin's language. MUI ships no Uzbek, so it showed English.
type Words = { rows: string; of: string; more: string; first: string; last: string; next: string; prev: string; noOptions: string; loading: string; clear: string; close: string; open: string };
const words: Record<Language, Words> = {
  uz: { rows: 'Sahifada:', of: 'dan', more: 'dan ko‘p', first: 'Birinchi sahifa', last: 'Oxirgi sahifa', next: 'Keyingi sahifa', prev: 'Oldingi sahifa', noOptions: 'Topilmadi', loading: 'Yuklanmoqda…', clear: 'Tozalash', close: 'Yopish', open: 'Ochish' },
  ru: { rows: 'Строк на странице:', of: 'из', more: 'более', first: 'Первая страница', last: 'Последняя страница', next: 'Следующая страница', prev: 'Предыдущая страница', noOptions: 'Ничего не найдено', loading: 'Загрузка…', clear: 'Очистить', close: 'Закрыть', open: 'Открыть' },
  en: { rows: 'Rows per page:', of: 'of', more: 'more than', first: 'First page', last: 'Last page', next: 'Next page', prev: 'Previous page', noOptions: 'No options', loading: 'Loading…', clear: 'Clear', close: 'Close', open: 'Open' },
};

export function muiLocale(language: Language): ThemeOptions {
  const w = words[language] ?? words.uz;
  const pageLabel = (type: string) => type === 'first' ? w.first : type === 'last' ? w.last : type === 'next' ? w.next : w.prev;
  return {
    components: {
      MuiTablePagination: {
        defaultProps: {
          labelRowsPerPage: w.rows,
          // Uzbek: "1–20 / 105 dan" reads oddly; "1–20 (jami 105)" is clear in every language.
          labelDisplayedRows: ({ from, to, count }) => language === 'uz'
            ? `${from}–${to} (jami ${count !== -1 ? count : `${to} ${w.more}`})`
            : `${from}–${to} ${w.of} ${count !== -1 ? count : `${w.more} ${to}`}`,
          getItemAriaLabel: pageLabel,
        },
      },
      MuiPagination: { defaultProps: { getItemAriaLabel: (type: string) => pageLabel(type) } },
      MuiAutocomplete: { defaultProps: { noOptionsText: w.noOptions, loadingText: w.loading, clearText: w.clear, closeText: w.close, openText: w.open } },
      MuiAlert: { defaultProps: { closeText: w.close } },
    },
  };
}
