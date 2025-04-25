'use client';

import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import Link from 'next/link';

export default function DebugPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 10 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Debug Page
        </Typography>
        <Typography variant="body1" paragraph>
          Use this page to test navigation and API endpoints
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 300, mx: 'auto' }}>
        <Button 
          variant="contained" 
          component={Link} 
          href="/login"
        >
          Go to Login Page (Next Link)
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={() => { window.location.href = '/login'; }}
        >
          Go to Login Page (window.location)
        </Button>
        
        <Button 
          color="secondary" 
          variant="contained" 
          component="a" 
          href="/login"
        >
          Go to Login Page (a href)
        </Button>
      </Box>
    </Container>
  );
} 