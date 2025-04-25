import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Typography,
  Box,
  IconButton,
  Button,
  TextField,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  FormHelperText,
  InputAdornment,
  OutlinedInput
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useLanguage } from '../contexts/LanguageContext';
import { useApiKeys } from '../contexts/ApiKeyContext';

interface ApiKeys {
  llm_api_key: string;
  tts_api_key: string;
  kling_access_key: string;
  kling_secret_key: string;
}

interface ApiKeySidebarProps {
  open: boolean;
  onClose: () => void;
}

const ApiKeySidebar: React.FC<ApiKeySidebarProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { apiKeys: contextApiKeys, refreshApiKeys } = useApiKeys();
  const [keys, setKeys] = useState<ApiKeys>({
    llm_api_key: '',
    tts_api_key: '',
    kling_access_key: '',
    kling_secret_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [showTtsKey, setShowTtsKey] = useState(false);
  const [showKlingAccessKey, setShowKlingAccessKey] = useState(false);
  const [showKlingSecretKey, setShowKlingSecretKey] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    if (open && isLoggedIn) {
      setKeys({
        llm_api_key: contextApiKeys?.llm_api_key || '',
        tts_api_key: contextApiKeys?.tts_api_key || '',
        kling_access_key: contextApiKeys?.kling_access_key || '',
        kling_secret_key: contextApiKeys?.kling_secret_key || ''
      });
    }
  }, [open, contextApiKeys, isLoggedIn]);

  const saveApiKeys = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('请先登录');
      }
      
      const response = await fetch('/api/keys', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(keys)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存API密钥失败');
      }
      
      setSuccess('API密钥已保存成功');
      setTimeout(() => setSuccess(''), 3000);
      
      await refreshApiKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setKeys(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleKeyVisibility = (keyName: 'llm' | 'tts' | 'kling_access' | 'kling_secret') => {
    switch(keyName) {
      case 'llm':
        setShowLlmKey(!showLlmKey);
        break;
      case 'tts':
        setShowTtsKey(!showTtsKey);
        break;
      case 'kling_access':
        setShowKlingAccessKey(!showKlingAccessKey);
        break;
      case 'kling_secret':
        setShowKlingSecretKey(!showKlingSecretKey);
        break;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">API密钥管理</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* API Key Status Notification */}
        {!isLoggedIn && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            您尚未登录，请先登录后再配置API密钥。
          </Alert>
        )}
        {isLoggedIn && !contextApiKeys?.llm_api_key && !contextApiKeys?.tts_api_key && 
         !contextApiKeys?.kling_access_key && !contextApiKeys?.kling_secret_key && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            您尚未配置任何API密钥，这可能会导致视频生成功能受限。请配置必要的API密钥。
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            请输入各服务的API密钥，用于视频生成、语音合成和文本生成。这些密钥将安全地存储在您的账户中。
          </Typography>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel htmlFor="llm-api-key">LLM API密钥</InputLabel>
            <OutlinedInput
              id="llm-api-key"
              name="llm_api_key"
              type={showLlmKey ? 'text' : 'password'}
              value={keys.llm_api_key}
              onChange={handleChange}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => toggleKeyVisibility('llm')}
                    edge="end"
                  >
                    {showLlmKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              }
              label="LLM API密钥"
            />
            <FormHelperText>用于生成销售文案的语言模型API密钥</FormHelperText>
          </FormControl>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel htmlFor="tts-api-key">语音合成API密钥</InputLabel>
            <OutlinedInput
              id="tts-api-key"
              name="tts_api_key"
              type={showTtsKey ? 'text' : 'password'}
              value={keys.tts_api_key}
              onChange={handleChange}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => toggleKeyVisibility('tts')}
                    edge="end"
                  >
                    {showTtsKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              }
              label="语音合成API密钥"
            />
            <FormHelperText>用于将文本转换为语音的API密钥</FormHelperText>
          </FormControl>
          
          <Typography variant="subtitle1" gutterBottom>视频生成API密钥</Typography>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel htmlFor="kling-access-key">视频生成 Access Key</InputLabel>
            <OutlinedInput
              id="kling-access-key"
              name="kling_access_key"
              type={showKlingAccessKey ? 'text' : 'password'}
              value={keys.kling_access_key}
              onChange={handleChange}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => toggleKeyVisibility('kling_access')}
                    edge="end"
                  >
                    {showKlingAccessKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              }
              label="视频生成 Access Key"
            />
            <FormHelperText>用于生成视频的API Access Key</FormHelperText>
          </FormControl>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel htmlFor="kling-secret-key">视频生成 Secret Key</InputLabel>
            <OutlinedInput
              id="kling-secret-key"
              name="kling_secret_key"
              type={showKlingSecretKey ? 'text' : 'password'}
              value={keys.kling_secret_key}
              onChange={handleChange}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => toggleKeyVisibility('kling_secret')}
                    edge="end"
                  >
                    {showKlingSecretKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              }
              label="视频生成 Secret Key"
            />
            <FormHelperText>用于生成视频的API Secret Key</FormHelperText>
          </FormControl>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={saveApiKeys}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ApiKeySidebar; 