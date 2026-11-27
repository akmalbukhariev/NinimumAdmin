import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    // Ninimum's own look (owner request 2026-11-27): brand red actions, ink secondary, light grey work area, white cards.
    primary: {
      main: '#E8453C',
      dark: '#C7362E',
      light: '#FFECEA',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2D3142',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2E9E5B',
    },
    warning: {
      main: '#F7A928',
    },
    error: {
      main: '#E53935',
    },
    background: {
      default: '#F5F6FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2233',
      secondary: '#6B7085',
    },
    divider: '#E6E8EF',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: 14,
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      textTransform: 'none',
      fontWeight: 650,
      fontSize: 14.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          minHeight: 36,
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
          borderRadius: 12,
          '@media (max-width:599.95px)': {
            width: 'calc(100% - 20px)',
            maxWidth: 'calc(100% - 20px)',
            maxHeight: 'calc(100% - 20px)',
            margin: 10,
            borderRadius: 12,
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
          fontWeight: 500,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});
