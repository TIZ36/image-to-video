'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress,
  Paper,
  Chip,
  Divider,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ImageIcon from '@mui/icons-material/Image';
import { generateScript, updateScript, generateVideo, generateScriptWithImage } from '../services/api.service';
import ImageSelector from './ImageSelector';

interface PromptFormProps {
  imageId: string | undefined;
  onVideoGenerated: (videoId: string) => void;
  existingScript?: string | null;
}

export default function PromptForm({ imageId, onVideoGenerated, existingScript }: PromptFormProps) {
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | false>('image');
  const [selectedImageId, setSelectedImageId] = useState<number>();
  
  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // 创意提示词
  const [suggestions] = useState([
    'Professional sales pitch',
    'Product showcase',
    'Emotional storytelling',
    'Feature highlight',
    'Customer testimonial style'
  ]);

  // 显示已存在的脚本
  useEffect(() => {
    if (existingScript && !script) {
      setScript(existingScript);
    }
  }, [existingScript, script]);

  const handleScriptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScript(event.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setScript(script ? `${script}, ${suggestion}` : suggestion);
  };
  
  const handleImageSelected = (id: number) => {
    setSelectedImageId(id);
  };
  
  const handleGenerateScript = async () => {
    if (!imageId) {
      setError('请先上传产品图片');
      return;
    }
    
    setIsGeneratingScript(true);
    setError(null);
    
    try {
      let result;
      
      // 如果有选中的图片ID，则使用该图片生成脚本
      if (selectedImageId) {
        result = await generateScriptWithImage(imageId, selectedImageId);
      } else {
        // 否则使用默认的图片生成脚本
        result = await generateScript(imageId);
      }
      
      setScript(result.script);
      setExpanded('script');
    } catch (err) {
      setError(err instanceof Error ? err.message : '文案生成失败');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!imageId) {
      setError('请先上传产品图片');
      return;
    }
    
    if (!script.trim()) {
      setError('请输入销售文案');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 先更新脚本
      await updateScript(imageId, { script: script.trim() });
      
      // 然后生成视频
      const result = await generateVideo(imageId);
      
      onVideoGenerated(result.video.url || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '视频生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {imageId && (
        <Accordion 
          expanded={expanded === 'image'} 
          onChange={handleAccordionChange('image')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography component="div" sx={{ display: 'flex', alignItems: 'center' }}>
              <ImageIcon sx={{ mr: 1 }} />
              选择图片
              {selectedImageId && (
                <Chip 
                  size="small" 
                  label="已选择" 
                  color="success" 
                  sx={{ ml: 2 }} 
                />
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ImageSelector 
              projectId={imageId} 
              onImageSelected={handleImageSelected}
              selectedImageId={selectedImageId}
            />
          </AccordionDetails>
        </Accordion>
      )}
      
      <Accordion 
        expanded={expanded === 'script'} 
        onChange={handleAccordionChange('script')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <RecordVoiceOverIcon sx={{ mr: 1 }} />
            销售文案
            {script && (
              <Chip 
                size="small" 
                label="已添加" 
                color="success" 
                sx={{ ml: 2 }} 
              />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="输入销售脚本"
              variant="outlined"
              value={script}
              onChange={handleScriptChange}
              placeholder="编写销售文案或使用AI生成..."
              disabled={!imageId || loading || isGeneratingScript}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  创意提示:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {suggestions.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      color="primary"
                      variant="outlined"
                      clickable
                      disabled={!imageId || loading}
                      size="small"
                      sx={{ transition: 'all 0.2s ease' }}
                    />
                  ))}
                </Box>
              </Box>
              
              <Button 
                onClick={handleGenerateScript}
                disabled={!imageId || isGeneratingScript}
                variant="outlined"
                size="small"
                startIcon={isGeneratingScript ? <CircularProgress size={16} /> : <RecordVoiceOverIcon />}
              >
                {isGeneratingScript ? '生成中...' : 'AI生成文案'}
              </Button>
            </Box>
            
            {script && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="primary">文案预览</Typography>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.50', 
                    borderRadius: 1,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Typography variant="body2">
                    {script}
                  </Typography>
                  
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderRadius: '50%',
                      p: 0.5
                    }}
                  >
                    <VolumeUpIcon fontSize="small" color="action" />
                  </Box>
                </Paper>
              </Box>
            )}
          </form>
          
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
      
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={!imageId || loading || !script.trim()}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MovieIcon />}
        sx={{ py: 1.5 }}
        onClick={handleSubmit}
      >
        {loading ? '生成中...' : '生成销售视频'}
      </Button>
    </Box>
  );
} 