import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface ApiKeys {
  llm_api_key: string;
  tts_api_key: string;
  kling_access_key: string;
  kling_secret_key: string;
}

const ApiKeyManager = () => {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKeys>({
    llm_api_key: '',
    tts_api_key: '',
    kling_access_key: '',
    kling_secret_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 检查用户登录状态
    const token = localStorage.getItem('token');
    if (!token) {
      // 如果用户未登录，不需要加载
      return;
    }
    
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('请先登录');
      }
      
      const response = await fetch('/api/keys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('获取API密钥失败');
      }
      
      const data = await response.json();
      
      if (data.success && data.keys) {
        // 处理可能存在的旧格式密钥
        const updatedKeys = {...data.keys};
        
        // 如果存在旧的kling_api_key但没有kling_access_key，则迁移
        if (data.keys.kling_api_key && !data.keys.kling_access_key) {
          updatedKeys.kling_access_key = data.keys.kling_api_key;
        }
        
        setKeys(updatedKeys);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
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
      
      setSaveSuccess(true);
      handleClose();
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

  const handleOpen = () => {
    setOpen(true);
    loadApiKeys();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSnackbarClose = () => {
    setSaveSuccess(false);
    setError('');
  };

  return (
    <>
      <Button 
        variant="outlined" 
        startIcon={<SettingsIcon />}
        onClick={handleOpen}
        sx={{ marginLeft: 1 }}
      >
        API密钥设置
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>API密钥设置</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              请设置各服务的API密钥，这些密钥将用于生成视频、语音和文本内容。
            </Typography>
            
            <TextField
              fullWidth
              label="LLM API密钥"
              name="llm_api_key"
              value={keys.llm_api_key}
              onChange={handleChange}
              margin="normal"
              placeholder="填入您的LLM API密钥"
              type="password"
            />
            
            <TextField
              fullWidth
              label="语音合成API密钥"
              name="tts_api_key"
              value={keys.tts_api_key}
              onChange={handleChange}
              margin="normal"
              placeholder="填入您的TTS API密钥"
              type="password"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              视频生成密钥
            </Typography>
            
            <TextField
              fullWidth
              label="视频生成访问密钥 (Access Key)"
              name="kling_access_key"
              value={keys.kling_access_key}
              onChange={handleChange}
              margin="normal"
              placeholder="填入您的Kling Access Key"
              type="password"
            />
            
            <TextField
              fullWidth
              label="视频生成安全密钥 (Secret Key)"
              name="kling_secret_key"
              value={keys.kling_secret_key}
              onChange={handleChange}
              margin="normal"
              placeholder="填入您的Kling Secret Key"
              type="password"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={saveSuccess || !!error} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={saveSuccess ? "success" : "error"}
        >
          {saveSuccess ? "API密钥保存成功" : error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ApiKeyManager; 