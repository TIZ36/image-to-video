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
  Tooltip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ShareIcon from '@mui/icons-material/Share';
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { addAudioToVideo, getProjectSpeeches, getVideoUrl } from '../services/api.service';

interface VideoPlayerProps {
  videoUrl: string; // 无声视频URL
  audioVideoUrl?: string; // 有声视频URL，可选
  onReset: () => void;
  projectId?: string;
  selectedProject?: any;
  onRefreshProject?: (projectId: string) => Promise<any>; // 添加刷新项目的回调
}

export default function VideoPlayer({ 
  videoUrl, 
  audioVideoUrl, 
  onReset, 
  projectId, 
  selectedProject,
  onRefreshProject 
}: VideoPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasAvailableSpeech, setHasAvailableSpeech] = useState(false);
  const [isAddingAudio, setIsAddingAudio] = useState(false);
  const [videoWithAudio, setVideoWithAudio] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(audioVideoUrl ? 1 : 0); // 默认选择有声视频（如果存在）

  // 当存在新的有声视频URL时，自动切换到有声视频标签
  useEffect(() => {
    if (audioVideoUrl) {
      setActiveTab(1); // 切换到有声视频标签
    }
  }, [audioVideoUrl]);

  // Check if project has audio available
  useEffect(() => {
    if (!projectId) return;

    const checkSpeechAvailability = async () => {
      try {
        const response = await getProjectSpeeches(projectId);
        setHasAvailableSpeech(response.speeches && response.speeches.length > 0);
      } catch (err) {
        console.error('Failed to check speech availability:', err);
        setHasAvailableSpeech(false);
      }
    };

    checkSpeechAvailability();
  }, [projectId]);

  // Determine if the current video already has audio
  const [videoAlreadyHasAudio, setVideoAlreadyHasAudio] = useState(false);
  
  useEffect(() => {
    // 当存在有声视频URL时，设置为已有音频
    if (audioVideoUrl) {
      setVideoAlreadyHasAudio(true);
      return;
    }
    
    // Check if the current video already has audio based on URL path or metadata
    // This is a more thorough check to determine if video already has audio
    if (videoUrl) {
      if (videoUrl.includes('video_with_audio')) {
        setVideoAlreadyHasAudio(true);
      } else if (videoUrl.includes('with_audio=true')) {
        setVideoAlreadyHasAudio(true);
      } else if (
        // Check against the current selected project's video data
        projectId && 
        selectedProject?.video?.with_audio === true
      ) {
        setVideoAlreadyHasAudio(true);
      } else {
        setVideoAlreadyHasAudio(false);
      }
    } else {
      setVideoAlreadyHasAudio(false);
    }
  }, [videoUrl, audioVideoUrl, projectId, selectedProject]);

  if (!videoUrl && !audioVideoUrl) {
    return null;
  }

  const handleCopyLink = () => {
    // 复制当前活动标签的视频URL - 确保使用正确的URL
    const urlToCopy = activeTab === 0 
      ? (videoUrl ? getVideoUrl(videoUrl) : '')
      : (audioVideoUrl ? getVideoUrl(audioVideoUrl) : (videoWithAudio ? getVideoUrl(videoWithAudio) : (videoUrl ? getVideoUrl(videoUrl) : '')));
    
    navigator.clipboard.writeText(urlToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => console.error('Failed to copy video URL:', err));
  };

  // 处理标签切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle adding audio to video
  const handleAddAudioToVideo = async () => {
    if (!projectId) {
      setError('项目ID无效，请刷新页面重试');
      return;
    }
    
    try {
      setIsAddingAudio(true);
      setError(null);
      
      const result = await addAudioToVideo(projectId);
      
      if (result.success && result.video?.url) {
        console.log('音频添加成功，视频URL:', result.video.url);
        setVideoWithAudio(result.video.url);
        setActiveTab(1); // 自动切换到有声视频标签
        
        // 如果有回调函数，调用刷新项目数据而不是重载页面
        if (onRefreshProject) {
          console.log('正在刷新项目数据...');
          await onRefreshProject(projectId);
          console.log('项目数据刷新完成');
        }
      } else {
        // More user-friendly error messages based on common failure reasons
        let errorMessage = result.message || '添加音频失败';
        
        // Map backend error messages to user-friendly messages
        if (errorMessage.includes('No video has been generated')) {
          errorMessage = '请先生成视频';
        } else if (errorMessage.includes('No speech has been generated')) {
          errorMessage = '请先生成旁白语音';
        } else if (errorMessage.includes('Video file not found')) {
          errorMessage = '视频文件丢失，请重新生成视频';
        } else if (errorMessage.includes('Speech audio file not found')) {
          errorMessage = '语音文件丢失，请重新生成语音';
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Failed to add audio to video:', err);
      const errorMessage = err instanceof Error ? err.message : '添加音频失败';
      
      // Map error messages to user-friendly messages
      let userMessage = errorMessage;
      if (errorMessage.includes('No video has been generated')) {
        userMessage = '请先生成视频';
      } else if (errorMessage.includes('No speech has been generated')) {
        userMessage = '请先生成旁白语音';
      } else if (errorMessage.includes('Video file not found')) {
        userMessage = '视频文件丢失，请重新生成视频';
      } else if (errorMessage.includes('Speech audio file not found')) {
        userMessage = '语音文件丢失，请重新生成语音';
      }
      
      setError(userMessage);
    } finally {
      setIsAddingAudio(false);
    }
  };

  // 获取当前选中视频的URL - 使用getVideoUrl确保URL正确
  const currentVideoUrl = activeTab === 0 
    ? (videoUrl ? getVideoUrl(videoUrl) : '') 
    : (audioVideoUrl ? getVideoUrl(audioVideoUrl) : (videoWithAudio ? getVideoUrl(videoWithAudio) : (videoUrl ? getVideoUrl(videoUrl) : '')));
  
  // 确定下载按钮使用的URL - 使用getVideoUrl确保URL正确
  const downloadUrl = activeTab === 0 
    ? (videoUrl ? getVideoUrl(videoUrl) : '') 
    : (audioVideoUrl ? getVideoUrl(audioVideoUrl) : (videoWithAudio ? getVideoUrl(videoWithAudio) : (videoUrl ? getVideoUrl(videoUrl) : '')));
  
  // 确定下载文件名
  const downloadFilename = activeTab === 0 
    ? "original-video.mp4" 
    : "video-with-audio.mp4";

  // 输出调试信息
  useEffect(() => {
    console.log('视频播放器URLs:');
    console.log('- 原始视频URL:', videoUrl);
    console.log('- 有声视频URL:', audioVideoUrl);
    console.log('- 添加音频后URL:', videoWithAudio);
    console.log('- 当前使用URL:', currentVideoUrl);
    console.log('- 当前标签:', activeTab);
  }, [videoUrl, audioVideoUrl, videoWithAudio, currentVideoUrl, activeTab]);

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
          {/* 视频类型切换标签 */}
          {(audioVideoUrl || videoWithAudio) && (
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab 
                icon={<VolumeOffIcon fontSize="small" />} 
                label="原始视频" 
                sx={{ fontSize: '0.8rem' }}
              />
              <Tab 
                icon={<VolumeUpIcon fontSize="small" />} 
                label="带语音视频" 
                sx={{ fontSize: '0.8rem' }}
              />
            </Tabs>
          )}
          
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
              <Typography variant="caption">
                {activeTab === 0 ? '原始视频' : '带语音视频'}
              </Typography>
            </Box>
            <video
              controls
              autoPlay
              src={currentVideoUrl}
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
              {projectId && hasAvailableSpeech && !videoWithAudio && !videoAlreadyHasAudio && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={isAddingAudio ? <CircularProgress size={20} /> : <AudiotrackIcon />}
                  onClick={handleAddAudioToVideo}
                  disabled={isAddingAudio}
                  size="small"
                >
                  {isAddingAudio ? '处理中...' : '添加语音'}
                </Button>
              )}
            
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
                href={downloadUrl}
                download={downloadFilename}
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
                视频已生成完成，可下载使用{activeTab === 1 ? '（含语音旁白）' : ''}
              </Typography>
              <Box>
                <Chip size="small" label="AI生成" color="primary" variant="outlined" sx={{ mr: 0.5 }} />
                {activeTab === 1 && (
                  <Chip size="small" label="含语音" color="secondary" variant="outlined" />
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
} 