'use client';

import React from 'react';
import { useLanguage, languageNames, Language } from '../contexts/LanguageContext';
import { Box, Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as Language);
  };

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth size="small">
        <Select
          value={language}
          onChange={handleChange}
          displayEmpty
          sx={{ 
            '& .MuiSelect-select': { 
              py: 1,
              display: 'flex',
              alignItems: 'center'
            }
          }}
        >
          {Object.entries(languageNames).map(([code, name]) => (
            <MenuItem key={code} value={code}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default LanguageSwitcher; 