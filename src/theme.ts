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
