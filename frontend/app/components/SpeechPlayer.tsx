'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { getProjectSpeeches, getSpeechUrl } from '../services/api.service';
import { useLanguage } from '../contexts/LanguageContext';

interface SpeechPlayerProps {
  projectId?: string;
}

export default function SpeechPlayer({ projectId }: SpeechPlayerProps) {
  const { t } = useLanguage();
  const [speeches, setSpeeches] = useState<Array<{path: string, created_at: string, language: string}>>([]);
  const [currentSpeechUrl, setCurrentSpeechUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 初始化音频播放器和加载项目的语音
  useEffect(() => {
    // 创建音频元素
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    
    // 加载项目语音
    if (projectId) {
      loadProjectSpeeches();
    }
    
    return () => {
      // 清理
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.removeEventListener('play', () => setIsPlaying(true));
        audioRef.current.removeEventListener('pause', () => setIsPlaying(false));
        audioRef.current.removeEventListener('ended', () => setIsPlaying(false));
      }
    };
  }, [projectId]);
  
  // 当语音URL更新时，更新音频源
  useEffect(() => {
    if (audioRef.current && currentSpeechUrl) {
      audioRef.current.src = currentSpeechUrl;
    }
  }, [currentSpeechUrl]);
  
  // 加载项目语音列表
  const loadProjectSpeeches = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getProjectSpeeches(projectId);
      setSpeeches(response.speeches);
      
      // 如果有语音，设置最新的一个为当前语音
      if (response.speeches && response.speeches.length > 0) {
        // 按创建时间排序，获取最新的语音
        const sortedSpeeches = [...response.speeches].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const latestSpeech = sortedSpeeches[0];
        setCurrentSpeechUrl(getSpeechUrl(latestSpeech.path));
      }
    } catch (err) {
      console.error('Failed to load speeches:', err);
      setError(err instanceof Error ? err.message : t('speech.load.failed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 播放/暂停当前语音
  const handleTogglePlay = () => {
    if (!audioRef.current || !currentSpeechUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setError(t('speech.play.failed'));
      });
    }
  };
  
  // 格式化创建时间
  const formatCreatedAt = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleString();
    } catch (e) {
      return isoDate;
    }
  };
  
  return (
    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <VolumeUpIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
          {t('speech.player')}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : speeches.length > 0 ? (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              {t('speech.latest')}: {formatCreatedAt(speeches[0].created_at)}
            </Typography>
            
            <IconButton 
              color="primary"
              onClick={handleTogglePlay}
              disabled={!currentSpeechUrl}
              sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                width: 40,
                height: 40
              }}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, textAlign: 'center' }}>
          {t('speech.not.found')}
        </Typography>
      )}
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
} 