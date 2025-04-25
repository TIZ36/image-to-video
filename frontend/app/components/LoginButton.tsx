'use client';

import React from 'react';
import Button from '@mui/material/Button';
import LoginIcon from '@mui/icons-material/Login';

export default function LoginButton() {
  const handleLogin = () => {
    // 使用简单的链接导航，但改为导航到调试页面
    window.location.href = '/login-debug';
  };

  return (
    <Button
      variant="contained"
      color="primary"
      size="small"
      startIcon={<LoginIcon />}
      onClick={handleLogin}
    >
      登录
    </Button>
  );
} 