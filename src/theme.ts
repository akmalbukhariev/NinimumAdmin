import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FD473C',
      dark: '#E73C32',
      light: '#FFF0EF',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#7CB518',
    },
    warning: {
      main: '#F7A928',
    },
    error: {
      main: '#EA1111',
    },
    background: {
      default: '#F7F8FB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#22292F',
      secondary: '#96979B',
    },
    divider: '#E8E9ED',
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: {
      fontWeight: 750,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          '@media (max-width:599.95px)': {
            minHeight: 42,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width:599.95px)': {
            width: 'calc(100% - 20px)',
            maxWidth: 'calc(100% - 20px)',
            maxHeight: 'calc(100% - 20px)',
            margin: 10,
            borderRadius: 16,
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          '@media (max-width:599.95px)': {
            padding: '18px 18px 10px',
            fontSize: '1.15rem',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 20,
          '@media (max-width:599.95px)': {
            paddingLeft: 18,
            paddingRight: 18,
            paddingBottom: 18,
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
          gap: 8,
          '@media (max-width:599.95px)': {
            padding: '12px 18px 18px',
            '& .MuiButton-root': { flex: 1, minHeight: 44 },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          '@media (max-width:599.95px)': {
            paddingTop: 11,
            paddingBottom: 11,
            paddingLeft: 12,
            paddingRight: 12,
            whiteSpace: 'nowrap',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '@media (max-width:599.95px)': {
            minWidth: 0,
            paddingLeft: 14,
            paddingRight: 14,
            fontSize: 13,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
        },
      },
    },
  },
});
