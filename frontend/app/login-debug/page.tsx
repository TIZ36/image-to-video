'use client';

import React, { useState, useEffect } from 'react';
import { 
  Typography, Container, Box, Paper, Button, TextField, 
  Alert, Divider, Checkbox, FormControlLabel
} from '@mui/material';

export default function LoginDebugPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [storedToken, setStoredToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 注册相关状态
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerIsAdmin, setRegisterIsAdmin] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  // 检查本地存储中的令牌
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    setStoredToken(token || '');
    setIsLoggedIn(!!token);
  }, []);
  
  const handleDirectLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      console.log('Sending direct login request');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }
      
      setToken(data.token);
      setSuccess('登录成功! 获取到令牌: ' + data.token.substring(0, 10) + '...');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegister = async () => {
    if (!registerUsername || !registerPassword) {
      setError('用户名和密码不能为空');
      return;
    }
    
    setError('');
    setSuccess('');
    setRegistering(true);
    
    try {
      console.log('Sending register request');
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        },
        body: JSON.stringify({ 
          username: registerUsername, 
          password: registerPassword,
          is_admin: registerIsAdmin
        }),
      });
      
      console.log('Register response status:', response.status);
      const data = await response.json();
      console.log('Register response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }
      
      setSuccess('用户注册成功! ' + data.message);
      setRegisterUsername('');
      setRegisterPassword('');
      setRegisterIsAdmin(false);
      setShowRegister(false);
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };
  
  const handleSaveToken = () => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      setSuccess('令牌已保存到本地存储');
      setStoredToken(token);
      setIsLoggedIn(true);
    }
  };
  
  const handleClearToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setSuccess('已清除令牌');
    setStoredToken('');
    setIsLoggedIn(false);
  };
  
  const handleGoHome = () => {
    window.location.href = '/';
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" align="center" gutterBottom>
          登录调试页面
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            当前状态:
          </Typography>
          <Typography variant="body1">
            是否已登录: <strong>{isLoggedIn ? '是' : '否'}</strong>
          </Typography>
          {storedToken && (
            <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-all' }}>
              存储的令牌: {storedToken.substring(0, 20)}...
            </Typography>
          )}
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            API登录测试
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
            <TextField
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />
            <TextField
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button 
              variant="contained" 
              onClick={handleDirectLogin}
              disabled={loading}
              fullWidth
            >
              {loading ? '登录中...' : '直接测试API登录'}
            </Button>
          </Box>
        </Box>
        
        {isLoggedIn && (
          <>
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  用户注册（仅管理员）
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => setShowRegister(!showRegister)}
                  size="small"
                >
                  {showRegister ? '隐藏' : '显示'}
                </Button>
              </Box>
              
              {showRegister && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
                  <TextField
                    label="新用户名"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="新密码"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={registerIsAdmin}
                        onChange={(e) => setRegisterIsAdmin(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="设为管理员"
                  />
                  <Button 
                    variant="contained" 
                    color="secondary"
                    onClick={handleRegister}
                    disabled={registering}
                    fullWidth
                  >
                    {registering ? '注册中...' : '注册新用户'}
                  </Button>
                </Box>
              )}
            </Box>
          </>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="outlined" 
            onClick={handleSaveToken}
            disabled={!token}
          >
            保存令牌到本地存储
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleClearToken}
          >
            清除本地存储的令牌
          </Button>
          <Button 
            variant="contained" 
            onClick={handleGoHome}
          >
            返回首页
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 