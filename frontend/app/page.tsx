'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  Divider,
  Chip
} from '@mui/material';
import ImageGallery from './components/ImageGallery';
import PromptForm from './components/PromptForm';
import VideoPlayer from './components/VideoPlayer';
import ProjectList from './components/ProjectList';
import Header from './components/Header';
import { useLanguage } from './contexts/LanguageContext';
import { listProjects, getProject, Project, getVideoUrl } from './services/api.service';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import MovieIcon from '@mui/icons-material/Movie';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import SpeechPlayer from './components/SpeechPlayer';

// Create Material UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
  },
});

// Main application steps
const steps = ['Upload & Select Image', 'Create Sales Script', 'Get Sales Video'];

export default function Home() {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 添加请求计数器，避免竞态条件
  const requestCounterRef = useRef<number>(0);

  // 加载项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await listProjects();
        setProjects(response.projects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 选择项目
  const handleProjectSelect = async (project: Project) => {
    try {
      setLoading(true);
      
      // 增加请求计数器
      const requestId = ++requestCounterRef.current;
      console.log(`开始加载项目 [请求ID: ${requestId}]`);
      
      // 刷新获取最新项目数据而不是使用传入的项目对象
      const response = await getProject(project.id);
      
      // 如果不是最新请求，则忽略结果
      if (requestId !== requestCounterRef.current) {
        console.log(`忽略过期的项目加载请求 [请求ID: ${requestId}]`);
        return;
      }
      
      const updatedProject = response.project;
      
      console.log('选择项目时刷新获取的项目数据:', updatedProject);
      
      // 更新选中的项目为最新数据
      setSelectedProject(updatedProject);
      setProjectId(updatedProject.id);
      
      // 重置相关状态
      setVideoUrl(null);
      
      // 设置项目状态
      if (updatedProject.image_path) {
        setActiveStep(1);
      }
      
      if (updatedProject.video && updatedProject.video.url) {
        // 如果有视频URL，检查是无声还是有声视频
        const audioVideoUrl = getProjectAudioVideoUrl(updatedProject);
        const originalVideoUrl = getProjectOriginalVideoUrl(updatedProject);
        
        console.log('项目视频URL:', updatedProject.video.url);
        console.log('有声视频URL:', audioVideoUrl);
        console.log('原始视频URL:', originalVideoUrl);
        
        // 设置视频URL和状态
        if (audioVideoUrl) {
          setVideoUrl(audioVideoUrl);
        } else {
          setVideoUrl(originalVideoUrl || updatedProject.video.url);
        }
        
        setActiveStep(2);
      }
      
      // 更新项目列表中的项目
      setProjects(prev => 
        prev.map(p => p.id === updatedProject.id ? updatedProject : p)
      );
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新项目后的回调
  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects]);
    setSelectedProject(newProject);
    setProjectId(newProject.id);
    setActiveStep(0);
    setVideoUrl(null);
  };

  // 删除项目后的回调
  const handleProjectDeleted = (deletedProjectId: string) => {
    // 从项目列表中移除
    setProjects(prev => prev.filter(p => p.id !== deletedProjectId));
    
    // 如果被删除的是当前选中的项目，则重置当前项目
    if (selectedProject?.id === deletedProjectId) {
      setSelectedProject(null);
      setProjectId(undefined);
      setActiveStep(0);
      setVideoUrl(null);
    }
  };

  // Handle image upload completion
  const handleImageUploaded = (newProjectId: string) => {
    setProjectId(newProjectId);
    setActiveStep(1);
    
    // 刷新项目列表
    fetchUpdatedProject(newProjectId);
  };

  // Handle video generation completion
  const handleVideoGenerated = async (videoUrl: string) => {
    if (!projectId) {
      console.error('项目ID未设置，无法刷新项目数据');
      return;
    }
    
    try {
      console.log('视频生成完成，URL:', videoUrl);
      
      // 先设置视频URL
      setVideoUrl(videoUrl);
      setActiveStep(2);
      
      // 刷新获取最新项目数据
      await fetchUpdatedProject(projectId);
      
      console.log('视频生成后刷新的项目数据:', selectedProject);
    } catch (error) {
      console.error('视频生成后刷新项目失败:', error);
    }
  };

  // 获取更新后的项目详情
  const fetchUpdatedProject = async (projectId: string) => {
    try {
      // 增加请求计数器
      const requestId = ++requestCounterRef.current;
      console.log(`开始刷新项目 [请求ID: ${requestId}]`);
      
      setLoading(true);
      const response = await getProject(projectId);
      
      // 如果不是最新请求，则忽略结果
      if (requestId !== requestCounterRef.current) {
        console.log(`忽略过期的项目刷新请求 [请求ID: ${requestId}]`);
        return null;
      }
      
      const updatedProject = response.project;
      console.log('获取更新的项目数据:', updatedProject);
      
      // 更新选中的项目
      setSelectedProject(updatedProject);
      
      // 更新项目列表中的项目
      setProjects(prev => 
        prev.map(p => p.id === projectId ? updatedProject : p)
      );
      
      return updatedProject;
    } catch (error) {
      console.error('Failed to update project:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 获取项目有声视频URL
  const getProjectAudioVideoUrl = (project: Project | null): string | undefined => {
    if (!project || !project.video) return undefined;
    
    // 检查项目视频是否包含with_audio标志或URL中包含audio相关标记
    if (
      (project.video.with_audio === true) || 
      (project.video.url && project.video.url.includes('video_with_audio'))
    ) {
      // 返回相对路径，让VideoPlayer组件使用getVideoUrl处理
      return project.video.url;
    }
    
    // 如果没有明确标记但URL包含关键词，也认为是有声视频
    if (project.video.url && project.video.url.includes('with_audio')) {
      return project.video.url;
    }
    
    return undefined;
  };

  // 获取项目原始视频URL
  const getProjectOriginalVideoUrl = (project: Project | null): string | undefined => {
    if (!project || !project.video) return undefined;
    
    // 如果有原始视频信息，使用它
    if (project.video.original_video && project.video.original_video.url) {
      // 返回相对路径，让VideoPlayer组件使用getVideoUrl处理
      return project.video.original_video.url;
    }
    
    // 否则，检查当前视频是否是无声视频
    if (project.video.with_audio !== true && project.video.url) {
      return project.video.url;
    }
    
    return undefined;
  };

  // Reset the application flow
  const handleReset = () => {
    setProjectId(undefined);
    setVideoUrl(null);
    setActiveStep(0);
    setSelectedProject(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header />
      <Box
        sx={{
          minHeight: 'calc(100vh - var(--header-height))',
          backgroundColor: '#f5f5f5',
          pb: 4,
          pt: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 3,
            height: { md: 'calc(100vh - var(--header-height) - 48px)' }, // 在桌面视图中固定高度
            flexGrow: 1
          }}>
            {/* 项目列表 - 左侧 */}
            <Box sx={{ 
              width: { xs: '100%', md: '25%' }, 
              minWidth: { md: '250px' },
              height: { xs: 'auto', md: '100%' }, // 在桌面视图中设置高度100%
              flexShrink: 0
            }}>
              <ProjectList 
                projects={projects} 
                selectedProject={selectedProject}
                onProjectSelect={handleProjectSelect}
                onProjectCreated={handleProjectCreated}
                onProjectDeleted={handleProjectDeleted}
                loading={loading}
              />
            </Box>
            
            {/* 内容区 - 中右侧 */}
            <Box sx={{ 
              flexGrow: 1,
              height: { md: '100%' }, // 在桌面视图中设置高度100%
              overflowY: { md: 'auto' }, // 只让内容区可滚动
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '3px',
              }
            }}>
              {selectedProject || projectId ? (
                <>
                  {/* 项目标题和状态指示 */}
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h5" gutterBottom>
                      {selectedProject?.name || t('loading.project')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedProject?.description || ""}
                    </Typography>
                    
                    {/* 项目资源状态指示器 */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          bgcolor: selectedProject?.image_path ? 'success.light' : 'grey.200',
                          color: selectedProject?.image_path ? 'white' : 'text.secondary',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ImageIcon sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="body2">{t('product.image')}</Typography>
                      </Paper>
                      
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          bgcolor: selectedProject?.script ? 'success.light' : 'grey.200',
                          color: selectedProject?.script ? 'white' : 'text.secondary', 
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <DescriptionIcon sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="body2">{t('marketing.copy')}</Typography>
                      </Paper>
                      
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          bgcolor: selectedProject?.video ? 'success.light' : 'grey.200',
                          color: selectedProject?.video ? 'white' : 'text.secondary', 
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <MovieIcon sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="body2">{t('sales.video')}</Typography>
                      </Paper>
                    </Box>
                  </Paper>

                  {/* 资源编辑区域和视频展示 - 水平并排布局 */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
                    {/* 左侧编辑区域 */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 3,
                      width: { xs: '100%', lg: (selectedProject?.video?.url || videoUrl) ? '60%' : '100%' }
                    }}>
                      {/* Combined Image & Copy Section */}
                      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">
                            <ImageIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                            {t('product.media')}
                          </Typography>
                          <Chip 
                            label={selectedProject?.image_path ? t('images.added') : t('upload.images')} 
                            color={selectedProject?.image_path ? "success" : "default"}
                            size="small"
                          />
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        <PromptForm 
                          key={`prompt-form-${projectId || 'new'}`}
                          imageId={projectId} 
                          onVideoGenerated={handleVideoGenerated}
                          existingScript={selectedProject?.script}
                          onImageUploaded={handleImageUploaded} 
                        />
                      </Paper>
                      
                      {/* Speech Player */}
                      {selectedProject?.script && (
                        <SpeechPlayer 
                          projectId={projectId} 
                        />
                      )}
                    </Box>

                    {/* 右侧视频展示区 */}
                    {(selectedProject?.video?.url || videoUrl) && (
                      <Box sx={{ width: { xs: '100%', lg: '40%' } }}>
                        <Paper elevation={1} sx={{ 
                          p: 3, 
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <Typography variant="h6" gutterBottom>
                            <MovieIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                            {t('sales.video')}
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <VideoPlayer 
                              videoUrl={getProjectOriginalVideoUrl(selectedProject) || videoUrl || ''} 
                              audioVideoUrl={getProjectAudioVideoUrl(selectedProject)}
                              onReset={handleReset} 
                              projectId={projectId || selectedProject?.id}
                              selectedProject={selectedProject}
                              onRefreshProject={fetchUpdatedProject}
                            />
                          </Box>
                        </Paper>
                      </Box>
                    )}
                  </Box>
                </>
              ) : (
                <Paper
                  elevation={1}
                  sx={{
                    p: 4,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 'calc(100vh - var(--header-height) - 100px)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h5" gutterBottom color="textSecondary">
                    {t('select.create.project')}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    {t('project.will.display')}
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
