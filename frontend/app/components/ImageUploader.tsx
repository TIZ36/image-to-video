'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Paper,
  styled,
  Grid,
  IconButton,
  Tooltip,
  Fade
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { uploadImage, createProject, getProjectImages, ProjectImage } from '../services/api.service';
import { useLanguage } from '../contexts/LanguageContext';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const UploadBox = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  border: '2px dashed #ccc',
  backgroundColor: theme.palette.background.default,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  height: 200,
  width: '100%',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.main,
  },
}));

const ImageContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  height: 0,
  paddingTop: '100%', // 1:1 Aspect Ratio
  width: '100%',
  '&:hover .image-actions': {
    opacity: 1,
  },
}));

interface ImageUploaderProps {
  onImageUploaded: (imageId: string) => void;
  projectId?: string;
  existingImagePath?: string | null;
}

// 图片对象接口
interface ImageItem {
  id: string;
  src: string;
  file?: File;
  uploaded: boolean;
}

export default function ImageUploader({ onImageUploaded, projectId, existingImagePath }: ImageUploaderProps) {
  const { t } = useLanguage();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载项目所有图片
  useEffect(() => {
    const fetchProjectImages = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await getProjectImages(projectId);
        
        // 将API返回的图片转换为组件内部格式
        const projectImages: ImageItem[] = response.images.map(img => ({
          id: `api-${img.id}`,
          src: getImageSrc(img.path),
          uploaded: true
        }));
        
        setImages(projectImages);
      } catch (error) {
        console.error('Failed to fetch project images:', error);
        setError(t('load.failed'));
      } finally {
        setLoading(false);
      }
    };
    
    // 尝试获取所有图片
    fetchProjectImages();
    
    // 兼容旧版本 - 如果没有获取到多张图片，但有单张图片路径
    if (existingImagePath && images.length === 0) {
      let imageUrl = getImageSrc(existingImagePath);
      
      if (imageUrl) {
        setImages([{
          id: 'existing-' + Date.now(),
          src: imageUrl,
          uploaded: true
        }]);
      }
    }
  }, [projectId, t]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 处理每个选择的文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        setError(t('image.only'));
        continue;
      }

      // 创建预览
      const reader = new FileReader();
      reader.onload = () => {
        const imageId = 'new-' + Date.now() + '-' + i;
        
        setImages(prevImages => [
          ...prevImages,
          {
            id: imageId,
            src: reader.result as string,
            file: file,
            uploaded: false
          }
        ]);
      };
      reader.readAsDataURL(file);
    }

    // 重置文件输入，允许再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    // 处理每个拖放的文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        setError(t('image.only'));
        continue;
      }

      // 创建预览
      const reader = new FileReader();
      reader.onload = () => {
        const imageId = 'new-' + Date.now() + '-' + i;
        
        setImages(prevImages => [
          ...prevImages,
          {
            id: imageId,
            src: reader.result as string,
            file: file,
            uploaded: false
          }
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleUpload = async (imageItem: ImageItem) => {
    if (!imageItem.file || imageItem.uploaded) return;
    
    setLoading(true);
    setError(null);
    setActiveUpload(imageItem.id);
    
    try {
      let currentProjectId = projectId;
      if (!currentProjectId) {
        const projectResponse = await createProject({
          name: t('new.project'),
          description: t('from.image.upload')
        });
        currentProjectId = projectResponse.project.id;
      }
      
      const result = await uploadImage(currentProjectId, imageItem.file);
      
      // 更新图片为已上传状态
      setImages(prevImages => 
        prevImages.map(img => 
          img.id === imageItem.id 
            ? { ...img, uploaded: true }
            : img
        )
      );
      
      onImageUploaded(currentProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.failed'));
    } finally {
      setLoading(false);
      setActiveUpload(null);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prevImages => prevImages.filter(img => img.id !== id));
  };

  const handleAddMoreClick = () => {
    fileInputRef.current?.click();
  };

  // 处理图片预览显示
  const getImageSrc = (imageUrl: string) => {
    // 确保图片URL可以正确加载
    if (imageUrl.startsWith('data:')) {
      // data URL格式已经可以直接使用
      return imageUrl;
    } else if (imageUrl.startsWith('http')) {
      // 完整的HTTP URL可以直接使用
      return imageUrl;
    } else {
      // 相对路径，需要添加API服务器前缀
      // 确保路径以/开头
      if (!imageUrl.startsWith('/')) {
        imageUrl = `/${imageUrl}`;
      }
      
      return `http://localhost:8888${imageUrl}`;
    }
  };

  // 批量上传所有未上传的图片
  const handleUploadAll = async () => {
    if (loading) return;
    
    // 找到所有未上传的图片
    const notUploadedImages = images.filter(img => !img.uploaded && img.file);
    if (notUploadedImages.length === 0) return;
    
    // 依次上传每张图片
    for (const img of notUploadedImages) {
      await handleUpload(img);
    }
  };

  return (
    <Box>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={2}>
        {/* 显示已添加的图片 */}
        {images.map((image) => (
          <Grid key={image.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <ImageContainer elevation={2}>
              <Box
                component="img"
                src={image.src}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                alt="Uploaded product"
              />
              <Box
                className="image-actions"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {!image.uploaded ? (
                  <Button
                    onClick={() => handleUpload(image)}
                    color="primary"
                    variant="contained"
                    disabled={loading && activeUpload === image.id}
                    startIcon={loading && activeUpload === image.id ? <CircularProgress size={20} /> : null}
                    sx={{ mb: 1 }}
                  >
                    {loading && activeUpload === image.id ? t('uploading') : t('upload')}
                  </Button>
                ) : (
                  <Typography
                    variant="caption"
                    sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    {t('uploaded')}
                  </Typography>
                )}
                <IconButton
                  color="error"
                  onClick={() => handleRemoveImage(image.id)}
                  disabled={loading}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.5)',
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </ImageContainer>
          </Grid>
        ))}

        {/* 添加更多图片区域 */}
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <UploadBox 
            onClick={handleAddMoreClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <AddCircleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body1" align="center">
              {t('add.image')}
            </Typography>
            <Typography variant="caption" color="textSecondary" align="center">
              {t('drag.drop.image')}
            </Typography>
          </UploadBox>
          <VisuallyHiddenInput
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleFileSelection}
          />
        </Grid>
      </Grid>

      {/* 批量上传按钮 */}
      {images.some(img => !img.uploaded && img.file) && (
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          disabled={loading}
          onClick={handleUploadAll}
          sx={{ mt: 2 }}
        >
          {loading ? t('uploading') : t('upload.all.images')}
        </Button>
      )}
    </Box>
  );
} 