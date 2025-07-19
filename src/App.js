import React, { useState, useEffect } from 'react';
import Sender from './Sender';
import Receiver from './Receiver';
import {
  Button,
  Container,
  Typography,
  Box,
  Paper,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  Fade,
  Grow
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import GetAppIcon from '@mui/icons-material/GetApp';
import SecurityIcon from '@mui/icons-material/Security';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5862d1',
      light: '#7986cb',
      dark: '#303f9f',
    },
    secondary: {
      main: '#0277bd',
      light: '#58a5f0',
      dark: '#004c8c',
    },
    background: {
      default: '#0a1929',
      paper: 'rgba(255, 255, 255, 0.05)',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    subtitle1: {
      fontSize: '1.1rem',
      opacity: 0.8,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '16px 32px',
          textTransform: 'none',
          fontSize: '1.1rem',
          fontWeight: 600,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(88, 98, 209, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(to bottom right, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
  },
});

function App() {
  const [role, setRole] = useState(null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (role === 'sender') return <Sender />;
  if (role === 'receiver') return <Receiver />;

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm">
        <Fade in={mounted} timeout={1000}>
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <SecurityIcon 
              sx={{ 
                fontSize: 48, 
                color: 'primary.main',
                animation: 'float 3s ease-in-out infinite',
              }} 
            />

            <Paper
              elevation={24}
              sx={{
                p: 4,
                width: '100%',
                borderRadius: 4,
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #5862d1, #0277bd)',
                },
              }}
            >
              <Grow in={mounted} timeout={1000}>
                <Box>
                  <Typography
                    variant="h3"
                    component="h1"
                    align="center"
                    gutterBottom
                    sx={{
                      mb: 2,
                      background: 'linear-gradient(45deg, #5862d1, #0277bd)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      textShadow: '0 2px 10px rgba(88, 98, 209, 0.2)',
                    }}
                  >
                    Secure P2P Transfer
                  </Typography>

                  <Typography
                    variant="subtitle1"
                    align="center"
                    sx={{ mb: 4 }}
                  >
                    End-to-end encrypted file transfer
                  </Typography>
                  
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: 2,
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<SendIcon />}
                      onClick={() => setRole('sender')}
                      fullWidth={isMobile}
                      sx={{ 
                        flex: isMobile ? 1 : '0 1 200px',
                        background: 'linear-gradient(45deg, #5862d1, #7986cb)',
                      }}
                    >
                      Send Files
                    </Button>
                    
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<GetAppIcon />}
                      onClick={() => setRole('receiver')}
                      fullWidth={isMobile}
                      sx={{ 
                        flex: isMobile ? 1 : '0 1 200px',
                        background: 'linear-gradient(45deg, #0277bd, #58a5f0)',
                      }}
                    >
                      Receive Files
                    </Button>
                  </Box>
                </Box>
              </Grow>
            </Paper>
          </Box>
        </Fade>
      </Container>
    </ThemeProvider>
  );
}

export default App;