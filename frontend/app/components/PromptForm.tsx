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
  AccordionDetails,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ImageIcon from '@mui/icons-material/Image';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import MicIcon from '@mui/icons-material/Mic';
import DescriptionIcon from '@mui/icons-material/Description';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { generateScript, updateScript, generateVideo, generateScriptWithImage, getPromptTemplates, savePromptTemplate, updatePromptTemplate, deletePromptTemplate, PromptTemplate, generateSpeech, getSpeechUrl } from '../services/api.service';
import ImageGallery from './ImageGallery';
import EditablePrompt, { 
  hasEditableSections, 
  createTemplateVariable 
} from './EditablePrompt';

// Define interfaces for prompts and presets
interface Preset {
  id: string;
  name: string;
  system_prompt: string;
  user_prompt: string;
}

interface ScriptOutput {
  description: string;
  narration: string;
}

interface PromptFormProps {
  imageId: string | undefined;
  onVideoGenerated: (videoId: string) => void;
  existingScript?: string | null;
  onImageUploaded?: (imageId: string) => void;
}

// Helper function to parse script into description and narration
const parseScript = (script: string | null | undefined): ScriptOutput => {
  // Check if script is null or undefined
  if (!script) return { description: '', narration: '' };
  
  // Try to identify if the script already has sections
  if (script.includes('视频描述:') && script.includes('旁白文本:')) {
    const descriptionMatch = script.match(/视频描述:([\s\S]*?)(?=旁白文本:|$)/);
    const narrationMatch = script.match(/旁白文本:([\s\S]*?)$/);
    
    return {
      description: descriptionMatch ? descriptionMatch[1].trim() : '',
      narration: narrationMatch ? narrationMatch[1].trim() : ''
    };
  } else if (script.includes('视频描述：') && script.includes('旁白文本：')) {  // 处理中文冒号
    const descriptionMatch = script.match(/视频描述：([\s\S]*?)(?=旁白文本：|$)/);
    const narrationMatch = script.match(/旁白文本：([\s\S]*?)$/);
    
    return {
      description: descriptionMatch ? descriptionMatch[1].trim() : '',
      narration: narrationMatch ? narrationMatch[1].trim() : ''
    };
  }
  
  // If no structured format is found, use the first paragraph as description 
  // and the rest as narration
  const paragraphs = script.split('\n\n').filter(p => p.trim());
  if (paragraphs.length === 0) return { description: '', narration: '' };
  
  if (paragraphs.length === 1) {
    // If there's only one paragraph, use it as both description and narration
    return { description: paragraphs[0], narration: paragraphs[0] };
  }
  
  return {
    description: paragraphs[0],
    narration: paragraphs.slice(1).join('\n\n')
  };
};

// Default presets
const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'default-1',
    name: '专业销售视频',
    system_prompt: '你是一位专业的广告文案撰写人员，擅长创作吸引人的{{product_type:科技产品}}销售视频脚本。',
    user_prompt: '请根据图片内容，创作一段简短有力的产品销售脚本，突出产品的{{feature_focus:主要特点和价值}}。'
  },
  {
    id: 'default-2',
    name: '情感故事视频',
    system_prompt: '你是一位擅长讲述感人故事的文案创作者，能够将产品与{{emotion_type:日常生活}}情感体验相结合。',
    user_prompt: '请根据图片内容创作一个情感化的故事脚本，将产品融入到能引起{{target_audience:年轻家庭}}共鸣的场景中。'
  },
  {
    id: 'default-3',
    name: '技术特性展示',
    system_prompt: '你是一位精通{{industry:科技}}行业的文案撰写人员，能够清晰解释复杂的产品特性。',
    user_prompt: '请根据图片内容创作一个简洁明了的脚本，重点展示产品的{{tech_feature:技术特性}}和优势。'
  }
];

export default function PromptForm({ imageId, onVideoGenerated, existingScript, onImageUploaded }: PromptFormProps) {
  // State for prompts and generated script
  const [systemPrompt, setSystemPrompt] = useState('你是一位专业的广告文案撰写人员，擅长创作吸引人的{{product_type:科技产品}}销售视频脚本。');
  const [userPrompt, setUserPrompt] = useState('请根据图片内容，创作一段简短有力的产品销售脚本，突出产品的{{feature_focus:主要特点和价值}}。');
  const [scriptOutput, setScriptOutput] = useState<ScriptOutput>({ description: '', narration: '' });
  
  // State for UI elements
  const [loading, setLoading] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | false>('scriptInput');
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<Preset | PromptTemplate | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  
  // 添加语音状态
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [speechUrl, setSpeechUrl] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Add new states for template management
  const [onlineTemplates, setOnlineTemplates] = useState<PromptTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [processedSystemPrompt, setProcessedSystemPrompt] = useState('');
  const [processedUserPrompt, setProcessedUserPrompt] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showTemplateHelp, setShowTemplateHelp] = useState(false);
  
  // 处理面板展开/收起
  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // 处理标签页切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Add a useEffect hook to reset selected images when project changes
  useEffect(() => {
    // Reset selected images when project changes
    setSelectedImageIds([]);
  }, [imageId]);

  // 初始化音频播放器
  useEffect(() => {
    // 创建音频播放器实例
    const player = new Audio();
    
    // 添加事件监听器
    player.addEventListener('play', () => setIsPlaying(true));
    player.addEventListener('pause', () => setIsPlaying(false));
    player.addEventListener('ended', () => setIsPlaying(false));
    
    // 设置播放器实例
    setAudioPlayer(player);
    
    // 清理函数
    return () => {
      if (player) {
        player.pause();
        player.src = '';
        player.removeEventListener('play', () => setIsPlaying(true));
        player.removeEventListener('pause', () => setIsPlaying(false));
        player.removeEventListener('ended', () => setIsPlaying(false));
      }
    };
  }, []);
  
  // 更新音频源
  useEffect(() => {
    if (audioPlayer && speechUrl) {
      audioPlayer.src = speechUrl;
    }
  }, [audioPlayer, speechUrl]);

  // 显示已存在的脚本
  useEffect(() => {
    if (existingScript && (!scriptOutput.description && !scriptOutput.narration)) {
      const parsed = parseScript(existingScript);
      setScriptOutput(parsed);
    }
  }, [existingScript, scriptOutput.description, scriptOutput.narration]);

  // 处理文本输入更改
  const handleSystemPromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Setting system prompt:', value);
    setSystemPrompt(value);
  };

  const handleUserPromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    console.log('Setting user prompt:', value);
    setUserPrompt(value);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScriptOutput(prev => ({ ...prev, description: event.target.value }));
  };

  const handleNarrationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScriptOutput(prev => ({ ...prev, narration: event.target.value }));
  };

  // 处理图片选择
  const handleImagesSelected = (ids: number[]) => {
    setSelectedImageIds(ids);
  };
  
  // 使用模板时的处理函数
  const handleUseTemplate = (template: Preset | PromptTemplate) => {
    console.log('Using template:', template);
    setSystemPrompt(template.system_prompt);
    setUserPrompt(template.user_prompt);
    
    // Check if template has editable sections
    if (hasEditableSections(template.system_prompt) || hasEditableSections(template.user_prompt)) {
      setProcessedSystemPrompt(template.system_prompt);
      setProcessedUserPrompt(template.user_prompt);
    } else {
      setProcessedSystemPrompt('');
      setProcessedUserPrompt('');
    }
  };

  // 打开预设对话框
  const handleOpenPresetDialog = (preset: Preset | PromptTemplate | null = null) => {
    console.log('Opening preset dialog with:', preset);
    setCurrentPreset(preset);
    if (preset) {
      setNewPresetName(preset.name);
      setSystemPrompt(preset.system_prompt);
      setUserPrompt(preset.user_prompt);
    } else {
      setNewPresetName('');
    }
    setPresetDialogOpen(true);
  };

  // 保存预设
  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      return;
    }

    const newPreset: Preset = {
      id: currentPreset?.id || `preset-${Date.now()}`,
      name: newPresetName.trim(),
      system_prompt: systemPrompt,
      user_prompt: userPrompt
    };

    if (currentPreset) {
      // Update existing preset
      setPresets(prev => prev.map(p => p.id === currentPreset.id ? newPreset : p));
    } else {
      // Add new preset
      setPresets(prev => [...prev, newPreset]);
    }

    setPresetDialogOpen(false);
  };

  // 删除预设
  const handleDeletePreset = (presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
    
    // TODO: Delete from backend
    // deletePresetFromBackend(presetId);
  };

  // 使用预设
  const handleUsePreset = (preset: Preset) => {
    setSystemPrompt(preset.system_prompt);
    setUserPrompt(preset.user_prompt);
  };
  
  // Add template fetch on component mount
  useEffect(() => {
    // Fetch templates from server
    const fetchTemplates = async () => {
      if (!imageId) return;
      
      setLoadingTemplates(true);
      setTemplateError(null);
      
      try {
        const response = await getPromptTemplates();
        setOnlineTemplates(response.templates);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        setTemplateError('无法加载提示词模板');
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    fetchTemplates();
  }, [imageId]);

  // Update template management functions
  // Save template
  const handleSaveTemplate = async () => {
    if (!newPresetName.trim()) {
      return;
    }

    const templateData = {
      name: newPresetName.trim(),
      system_prompt: systemPrompt,
      user_prompt: userPrompt
    };

    try {
      setLoading(true);
      console.log('Saving template:', templateData);
      
      if (currentPreset && currentPreset.id.startsWith('preset-')) {
        // Update existing local preset
        const newPreset: Preset = {
          id: currentPreset.id,
          name: newPresetName.trim(),
          system_prompt: systemPrompt,
          user_prompt: userPrompt
        };
        
        setPresets(prev => prev.map(p => p.id === currentPreset.id ? newPreset : p));
      } else if (currentPreset && !currentPreset.id.startsWith('default-')) {
        // Update online template
        await updatePromptTemplate(currentPreset.id, templateData);
        
        // Refresh templates list
        const response = await getPromptTemplates();
        setOnlineTemplates(response.templates);
      } else {
        // Create new online template
        const response = await savePromptTemplate(templateData);
        
        // Add to online templates
        setOnlineTemplates(prev => [...prev, response.template]);
      }
      
      setPresetDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存模板失败');
    } finally {
      setLoading(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      
      if (templateId.startsWith('default-')) {
        // Can't delete default templates
        setError('无法删除默认模板');
        return;
      } else if (templateId.startsWith('preset-')) {
        // Delete local preset
        setPresets(prev => prev.filter(p => p.id !== templateId));
      } else {
        // Delete online template
        await deletePromptTemplate(templateId);
        
        // Refresh templates list
        const response = await getPromptTemplates();
        setOnlineTemplates(response.templates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除模板失败');
    } finally {
      setLoading(false);
    }
  };

  // Handle processed prompt changes from EditablePrompt
  const handleProcessedSystemPromptChange = (prompt: string) => {
    setProcessedSystemPrompt(prompt);
  };

  const handleProcessedUserPromptChange = (prompt: string) => {
    setProcessedUserPrompt(prompt);
  };

  // Add variable to prompt (for template creation)
  const handleAddVariable = (promptType: 'system' | 'user') => {
    const variableName = prompt('输入变量名称 (例如: product_name)');
    if (!variableName) return;
    
    const defaultValue = prompt('输入默认值 (可选)');
    const variable = createTemplateVariable(variableName, defaultValue || '');
    
    if (promptType === 'system') {
      setSystemPrompt(prev => prev + variable);
    } else {
      setUserPrompt(prev => prev + variable);
    }
  };

  // Toggle edit mode for template creation
  const handleToggleEditMode = () => {
    setEditMode(prev => !prev);
  };

  // 生成脚本
  const handleGenerateScript = async () => {
    if (!imageId) {
      setError('请先上传产品图片');
      return;
    }
    
    if (selectedImageIds.length === 0) {
      setError('请选择至少一张图片');
      return;
    }
    
    setIsGeneratingScript(true);
    setError(null);
    
    try {
      // Create the prompt data with system and user prompts
      const promptData = {
        system_prompt: `${processedSystemPrompt || systemPrompt}\n `,
        user_prompt: `${processedUserPrompt || userPrompt}\n\n请将脚本分为两部分：\n1. 视频描述：简短介绍视频内容\n2. 旁白文本：详细的语音旁白内容，`
      };
      
      let result;
      
      // 如果有选中的图片ID，则使用该图片生成脚本
      if (selectedImageIds.length > 0) {
        // 将所有选中的图片ID传递给后端
        console.log('selectedImageIds', selectedImageIds);
        console.log('imageId', imageId);
        console.log('promptData', promptData);
        result = await generateScriptWithImage(imageId, selectedImageIds, promptData);
      } else {
        setError('请选择至少一张图片');
        return;
      }
      
      // Parse the generated script into description and narration
      const parsed = parseScript(result.script);
      setScriptOutput(parsed);
      
      // Open the output accordion
      setExpanded('scriptOutput');
    } catch (err) {
      setError(err instanceof Error ? err.message : '文案生成失败');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 生成视频
  const handleGenerateVideo = async () => {
    if (!imageId) {
      setError('请先上传产品图片');
      return;
    }
    
    if (selectedImageIds.length === 0) {
      setError('请选择至少一张图片');
      return;
    }
    
    if (!scriptOutput.description) {
      setError('请先生成或输入视频描述');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Combine description and narration for saving to backend
      // 保存到后端时使用前缀，这样后端可以正确解析
      const fullScript = `视频描述:\n${scriptOutput.description}\n\n旁白文本:\n${scriptOutput.narration}`;
      
      // 先更新脚本
      await updateScript(imageId, { script: fullScript });
      
      // 然后生成视频
      const result = await generateVideo(imageId);
      
      onVideoGenerated(result.video.url || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '视频生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成语音旁白 (TTS)
  const handleGenerateVoice = async () => {
    if (!imageId) {
      setError('请先上传产品图片');
      return;
    }
    
    if (!scriptOutput.narration) {
      setError('请先生成或输入旁白文本');
      return;
    }
    
    setIsGeneratingVoice(true);
    setError(null);
    
    try {
      // 调用生成语音API - 直接传递narration内容，不需要前缀
      const result = await generateSpeech(imageId, scriptOutput.narration);
      
      if (result.success && result.speech.path) {
        // 获取完整URL
        const fullSpeechUrl = getSpeechUrl(result.speech.path);
        setSpeechUrl(fullSpeechUrl);
        
        // 成功消息
        console.log('语音生成成功:', fullSpeechUrl);
      } else {
        setError('语音生成失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '语音生成失败');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // 播放/暂停音频
  const handleTogglePlay = () => {
    if (!audioPlayer || !speechUrl) return;
    
    if (isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  // 在模板列表中显示预设
  const renderTemplateSecondary = (template: Preset | PromptTemplate) => {
    const prompt = template.system_prompt || '';
    if (hasEditableSections(prompt)) {
      return '包含可编辑变量';
    }
    return prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {imageId && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            选择用于视频的图片 (可多选):
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <ImageGallery
              projectId={imageId}
              onImageUploaded={onImageUploaded || (() => {})}
              onImageSelected={handleImagesSelected}
              selectedImageIds={selectedImageIds}
              multiSelect={true}
            />
          </Box>
        </>
      )}
      
      {/* Prompt Input Accordion */}
        <Accordion 
        expanded={expanded === 'scriptInput'} 
        onChange={handleAccordionChange('scriptInput')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ mr: 1 }} />
            提示词设置
            {(systemPrompt !== DEFAULT_PRESETS[0].system_prompt || 
              userPrompt !== DEFAULT_PRESETS[0].user_prompt) && (
                <Chip 
                  size="small" 
                label="已修改" 
                color="primary" 
                  sx={{ ml: 2 }} 
                />
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="prompt tabs">
              <Tab label="提示词编辑" />
              <Tab label="预设模板" />
            </Tabs>
          </Box>
          
          {/* 提示词编辑标签页 */}
          {tabValue === 0 && (
            <Box>
              {editMode && (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 1, 
                    mb: 2, 
                    bgcolor: 'info.light', 
                    color: 'info.contrastText',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <EditIcon sx={{ mr: 1, fontSize: 'small' }} />
                    模板编辑模式
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined"
                    color="inherit"
                    onClick={() => setShowTemplateHelp(true)}
                    startIcon={<HelpOutlineIcon />}
                    sx={{ bgcolor: 'info.main' }}
                  >
                    变量说明
                  </Button>
                </Paper>
              )}

              <Typography variant="subtitle2" gutterBottom>
                系统提示词 (AI角色设定)
                {editMode && (
                  <Button 
                    size="small" 
                    onClick={() => handleAddVariable('system')}
                    sx={{ ml: 1 }}
                  >
                    插入变量
                  </Button>
                )}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={systemPrompt}
                onChange={handleSystemPromptChange}
                placeholder="定义AI的角色和行为方式..."
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              {hasEditableSections(systemPrompt) && !editMode && (
                <EditablePrompt
                  promptTemplate={systemPrompt}
                  onProcessedPromptChange={handleProcessedSystemPromptChange}
                />
              )}
              
              <Typography variant="subtitle2" gutterBottom>
                用户提示词 (具体要求)
                {editMode && (
                  <Button 
                    size="small" 
                    onClick={() => handleAddVariable('user')}
                    sx={{ ml: 1 }}
                  >
                    插入变量
                  </Button>
                )}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={userPrompt}
                onChange={handleUserPromptChange}
                placeholder="描述你希望AI生成的内容和风格..."
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              {hasEditableSections(userPrompt) && !editMode && (
                <EditablePrompt
                  promptTemplate={userPrompt}
                  onProcessedPromptChange={handleProcessedUserPromptChange}
                />
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Button 
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => handleOpenPresetDialog()}
                  >
                    保存为模板
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleToggleEditMode}
                    sx={{ ml: 1 }}
                  >
                    {editMode ? '完成编辑' : '模板编辑'}
                  </Button>
                </Box>
                
                <Button
                  variant="contained"
                  onClick={handleGenerateScript}
                  disabled={!imageId || isGeneratingScript || selectedImageIds.length === 0}
                  startIcon={isGeneratingScript ? <CircularProgress size={20} /> : <VolumeUpIcon />}
                >
                  {isGeneratingScript ? '生成中...' : '生成脚本'}
                </Button>
              </Box>
            </Box>
          )}
          
          {/* 预设模板标签页 */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                本地预设
              </Typography>
              <List>
                {presets.map((preset) => (
                  <ListItem 
                    key={preset.id}
                    sx={{ 
                      mb: 1, 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <ListItemText
                      primary={preset.name}
                      secondary={renderTemplateSecondary(preset)}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleUseTemplate(preset)}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="edit"
                        onClick={() => handleOpenPresetDialog(preset)}
                      >
                        <EditIcon />
                      </IconButton>
                      {!preset.id.startsWith('default-') && (
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteTemplate(preset.id)}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              <Typography variant="subtitle2" sx={{ mb: 1, mt: 3 }}>
                在线模板
                {loadingTemplates && <CircularProgress size={16} sx={{ ml: 1 }} />}
              </Typography>
              
              {templateError && (
                <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                  {templateError}
                </Typography>
              )}
              
              <List>
                {onlineTemplates.map((template) => (
                  <ListItem 
                    key={template.id}
                    sx={{ 
                      mb: 1, 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'action.hover'
                    }}
                  >
                    <ListItemText
                      primary={template.name}
                      secondary={renderTemplateSecondary(template)}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleUseTemplate(template)}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="edit"
                        onClick={() => handleOpenPresetDialog(template)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleDeleteTemplate(template.id)}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleOpenPresetDialog()}
                sx={{ mt: 2 }}
                disabled={loadingTemplates}
              >
                创建新模板
              </Button>
            </Box>
          )}
          </AccordionDetails>
        </Accordion>
      
      {/* Script Output Accordion */}
      <Accordion 
        expanded={expanded === 'scriptOutput'} 
        onChange={handleAccordionChange('scriptOutput')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <RecordVoiceOverIcon sx={{ mr: 1 }} />
            生成内容
            {(scriptOutput.description || scriptOutput.narration) && (
              <Chip 
                size="small" 
                label="已生成" 
                color="success" 
                sx={{ ml: 2 }} 
              />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <DescriptionIcon sx={{ mr: 1, fontSize: 'small' }} />
              视频描述
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={scriptOutput.description}
              onChange={handleDescriptionChange}
              placeholder="视频的总体描述..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                      color="primary"
                onClick={handleGenerateVideo}
                disabled={!imageId || !scriptOutput.description || loading || selectedImageIds.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <MovieIcon />}
              >
                {loading ? '生成中...' : '生成视频'}
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <MicIcon sx={{ mr: 1, fontSize: 'small' }} />
              旁白文本
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={scriptOutput.narration}
              onChange={handleNarrationChange}
              placeholder="配音旁白文本..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              {speechUrl && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleTogglePlay}
                  startIcon={isPlaying ? <VolumeUpIcon /> : <PlayArrowIcon />}
                  sx={{ mr: 2 }}
                >
                  {isPlaying ? '暂停' : '播放'}
                </Button>
              )}
              <Button
                variant="contained"
                color="secondary"
                onClick={handleGenerateVoice}
                disabled={!scriptOutput.narration || isGeneratingVoice}
                startIcon={isGeneratingVoice ? <CircularProgress size={20} /> : <RecordVoiceOverIcon />}
              >
                {isGeneratingVoice ? '生成中...' : '生成语音'}
              </Button>
                  </Box>
              </Box>
        </AccordionDetails>
      </Accordion>
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {/* Preset Save Dialog */}
      <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)}>
        <DialogTitle>{currentPreset ? '编辑预设' : '保存预设'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="预设名称"
            type="text"
            fullWidth
            variant="outlined"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            系统提示词
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={systemPrompt}
            onChange={handleSystemPromptChange}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            用户提示词
          </Typography>
          <TextField
        fullWidth
            multiline
            rows={3}
            value={userPrompt}
            onChange={handleUserPromptChange}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={!newPresetName.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add a help dialog component for template variables */}
      <Dialog 
        open={showTemplateHelp} 
        onClose={() => setShowTemplateHelp(false)}
        maxWidth="md"
      >
        <DialogTitle>提示词模板变量说明</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            您可以在提示词中使用变量，格式为：<code>{'{{变量名:默认值}}'}</code>
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>
            示例：
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {`你是一位专业的{{industry:科技}}行业广告文案撰写人员，擅长为{{target:中小企业}}创作吸引人的产品销售视频。`}
            </Typography>
          </Paper>
          
          <Typography variant="body1" paragraph>
            当使用这个模板时，用户将能够修改 "industry" 和 "target" 的值，无需编辑整个提示词。
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>
            变量格式规则：
          </Typography>
          
          <ul>
            <li>变量名只能包含字母、数字和下划线</li>
            <li>默认值可选，如果不提供则为空</li>
            <li>变量名将自动转换为易读的标签（如 product_name 变为 "Product Name"）</li>
          </ul>
          
          <Button 
            variant="outlined" 
            onClick={() => setShowTemplateHelp(false)}
            sx={{ mt: 2 }}
          >
            关闭
      </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
} 