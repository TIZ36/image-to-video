'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Alert,
  Divider,
  Stack,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ShareIcon from '@mui/icons-material/Share';
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack';

interface VideoPlayerProps {
  videoUrl: string;
  onReset: () => void;
}

export default function VideoPlayer({ videoUrl, onReset }: VideoPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!videoUrl) {
    return null;
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(videoUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => console.error('Failed to copy video URL:', err));
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error ? (
        <Box sx={{ textAlign: 'center', py: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || '加载视频时出错'}
          </Alert>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={onReset}
          >
            重试
          </Button>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 视频播放区 */}
          <Box 
            sx={{ 
              position: 'relative',
              flexGrow: 1,
              minHeight: '250px',
              backgroundColor: 'black',
              borderRadius: 1,
              overflow: 'hidden',
              mb: 2
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 2,
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
                borderRadius: 1,
                p: 0.5,
                px: 1,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <VideoCameraBackIcon fontSize="inherit" />
              <Typography variant="caption">销售视频</Typography>
            </Box>
            <video
              controls
              autoPlay
              src={videoUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onError={() => setError('视频加载失败')}
            />
          </Box>
          
          {/* 视频操作区 - 更紧凑的布局 */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center', 
            mb: 2
          }}>
            <Box sx={{ display: 'flex' }}>
              <Tooltip title="点赞">
                <IconButton size="small" color="primary">
                  <ThumbUpIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={copied ? '链接已复制' : '分享链接'}>
                <IconButton size="small" color="primary" onClick={handleCopyLink}>
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={onReset}
                size="small"
              >
                新视频
              </Button>
              
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<DownloadIcon />}
                component="a"
                href={videoUrl}
                download="sales-video.mp4"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
              >
                下载
              </Button>
            </Box>
          </Box>
          
          {/* 视频信息区 - 更简洁 */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'background.default',
              fontSize: '0.875rem'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                视频已生成完成，可下载使用
              </Typography>
              <Box>
                <Chip size="small" label="AI生成" color="primary" variant="outlined" sx={{ mr: 0.5 }} />
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
} 