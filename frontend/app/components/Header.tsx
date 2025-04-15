'use client';

import { AppBar, Toolbar, Box, Typography } from '@mui/material';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header() {
  const { t } = useLanguage();
  
  return (
    <AppBar 
      position="fixed" 
      elevation={2} 
      sx={{ 
        borderBottom: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        backgroundColor: 'white',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderRadius: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <Toolbar>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            flexDirection: 'column', 
            flexGrow: 1,
            my: 0.5
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center'
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                mr: 1
              }}
            >
              B
            </Box>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 700, 
                letterSpacing: '0.5px',
                background: 'linear-gradient(45deg, #3f51b5 30%, #5c6bc0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2 
              }}
            >
              BOH
            </Typography>
          </Box>
          <Typography 
            variant="caption" 
            component="div" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 400,
              letterSpacing: '0.3px',
              mt: 0.2,
              ml: '36px', // logo width + margin
              fontSize: '0.7rem'
            }}
          >
            AI-Powered Sales Video Generator
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('choose.language')}:
          </Typography>
          <LanguageSwitcher />
        </Box>
      </Toolbar>
    </AppBar>
  );
} 