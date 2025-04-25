import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Typography, 
  Box, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText,
  Button, 
  TextField,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const ApiKeySidebar = ({ open, onClose }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      fetchApiKeys();
    }
  }, [open]);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/keys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('获取API密钥失败');
      }
      
      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      setError('请输入API密钥名称');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newKeyName })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '生成API密钥失败');
      }
      
      setSuccess('API密钥创建成功');
      setNewKeyName('');
      await fetchApiKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '撤销API密钥失败');
      }
      
      setSuccess('API密钥已撤销');
      await fetchApiKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key)
      .then(() => {
        setSuccess('API密钥已复制到剪贴板');
        setTimeout(() => setSuccess(''), 3000);
      })
      .catch(() => {
        setError('复制失败');
      });
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
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
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
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>生成新的API密钥</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              label="密钥名称"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              disabled={loading}
            />
            <Button 
              variant="contained" 
              onClick={generateApiKey}
              disabled={loading}
            >
              生成
            </Button>
          </Box>
        </Box>
        
        <Typography variant="subtitle1" sx={{ mb: 1 }}>已有API密钥</Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : apiKeys.length === 0 ? (
          <Typography color="text.secondary">暂无API密钥</Typography>
        ) : (
          <List>
            {apiKeys.map((key) => (
              <ListItem
                key={key.id}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton edge="end" onClick={() => copyApiKey(key.key)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <Button 
                      size="small" 
                      color="error"
                      onClick={() => revokeApiKey(key.id)}
                    >
                      撤销
                    </Button>
                  </Box>
                }
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText
                  primary={key.name}
                  secondary={key.key.substring(0, 8) + '...'}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default ApiKeySidebar; 