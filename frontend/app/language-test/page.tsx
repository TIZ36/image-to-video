'use client';

import React from 'react';
import { Container, Box, Typography, Paper, Button, Stack } from '@mui/material';
import { useLanguage, languageNames, Language } from '../contexts/LanguageContext';
import Header from '../components/Header';

export default function LanguageTestPage() {
  const { t, language, setLanguage } = useLanguage();

  const handleChangeLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <Box>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" align="center" gutterBottom>
            {t('app.title')}
          </Typography>
          <Typography variant="body1" align="center" paragraph>
            {t('app.subtitle')}
          </Typography>

          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('choose.language')}:
            </Typography>
            <Stack direction="row" spacing={2}>
              {Object.entries(languageNames).map(([code, name]) => (
                <Button 
                  key={code}
                  variant={language === code ? "contained" : "outlined"}
                  onClick={() => handleChangeLanguage(code as Language)}
                >
                  {name}
                </Button>
              ))}
            </Stack>
          </Box>

          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('product.image')}
            </Typography>
            <Typography variant="body1" paragraph>
              {t('drag.drop.image')}
            </Typography>
            <Button variant="contained" color="primary">
              {t('upload')}
            </Button>
          </Box>

          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('marketing.copy')}
            </Typography>
            <Typography variant="body1">
              {t('select.create.project')}
            </Typography>
          </Box>

          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('sales.video')}
            </Typography>
            <Typography variant="body1">
              {t('project.will.display')}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
} 