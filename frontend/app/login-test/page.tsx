'use client';

import React, { useEffect } from 'react';
import { Typography, Container, Box, CircularProgress } from '@mui/material';

export default function LoginTestPage() {
  useEffect(() => {
    // 在组件加载后1秒后重定向到登录页面
    const timer = setTimeout(() => {
      console.log('Redirecting to login page...');
      window.location.href = '/login';
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        mt: 10, 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }}>
        <Typography variant="h4">登录测试页面</Typography>
        <Typography variant="body1">正在重定向到登录页面...</Typography>
        <CircularProgress />
      </Box>
    </Container>
  );
} 