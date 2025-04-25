'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Container, TextField, Typography, Alert, Paper, CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// 创建Material UI主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Login page loaded');
    // 注意：我们在这里不检查令牌状态，也不进行重定向
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token ? 'Present' : 'Not found');
    
    // 如果要测试页面本身而不进行自动重定向，暂时注释这段代码
    /*
    if (token) {
      console.log('Redirecting to home page...');
      window.location.href = '/';
    }
    */
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Login attempt with username:', username);

    try {
      console.log('Sending login request to /api/auth/login');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response status:', response.status);

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      // 保存令牌到本地存储
      console.log('Login successful, saving token');
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', username);
      
      // 重定向到主页
      console.log('Redirecting to home page after successful login');
      window.location.href = '/';
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: { xs: 4, sm: 8 } }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '24px',
                mr: 1.5,
              }}
            >
              B
            </Box>
            <Typography
              variant="h4"
              component="div"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.5px',
                background: 'linear-gradient(45deg, #3f51b5 30%, #5c6bc0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BOH
            </Typography>
          </Box>
          
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            登录
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="用户名"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="密码"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.2 }}
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
            
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Button
                variant="text"
                size="small"
                color="primary"
                onClick={() => window.location.href = '/login-debug'}
                sx={{ textTransform: 'none' }}
              >
                需要注册？请联系管理员或访问注册页面
              </Button>
              
              <Typography variant="caption" color="text.secondary">
                默认管理员账号: admin / admin123
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
} 