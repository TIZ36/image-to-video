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
  Fade,
  Dialog
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import { uploadImage, createProject, getProjectImages, deleteProjectImage, ProjectImage } from '../services/api.service';
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
}));

interface ImageGalleryProps {
  onImageUploaded: (imageId: string) => void;
  onImageSelected?: (imageIds: number[]) => void;
  projectId?: string;
  existingImagePath?: string | null;
  selectedImageIds?: number[];
  multiSelect?: boolean;
}

// 图片对象接口
interface ImageItem {
  id: string;
  numericId?: number;
  src: string;
  file?: File;
  uploaded: boolean;
  selected?: boolean;
}

export default function ImageGallery({ 
  onImageUploaded, 
  onImageSelected, 
  projectId, 
  existingImagePath, 
  selectedImageIds = [],
  multiSelect = false
}: ImageGalleryProps) {
  const { t } = useLanguage();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project images and set selected state based on selectedImageIds
  useEffect(() => {
    const fetchProjectImages = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await getProjectImages(projectId);
        
        // Convert API response to component format
        const projectImages: ImageItem[] = response.images.map(img => ({
          id: `api-${img.id}`,
          numericId: img.id,
          src: getImageSrc(img.path),
          uploaded: true,
          selected: selectedImageIds.includes(img.id)
        }));
        
        setImages(projectImages);
      } catch (error) {
        console.error('Failed to fetch project images:', error);
        setError(t('load.failed'));
      } finally {
        setLoading(false);
      }
    };
    
    // Try to fetch all images
    fetchProjectImages();
    
    // Backward compatibility - if no multiple images but have a single image path
    if (existingImagePath && images.length === 0) {
      let imageUrl = getImageSrc(existingImagePath);
      
      if (imageUrl) {
        setImages([{
          id: 'existing-' + Date.now(),
          src: imageUrl,
          uploaded: true,
          selected: true
        }]);
      }
    }
  }, [projectId, t, selectedImageIds, existingImagePath]);

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
            ? { 
                ...img, 
                uploaded: true,
                // Extract numeric ID from the path if available
                numericId: extractImageId(result.image_path)
              }
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
  
  // Extract numeric ID from image path
  const extractImageId = (path: string): number | undefined => {
    // Extract ID from new format paths like '/api/images/project-image-1'
    const match = path.match(/\/api\/images\/.*-image-(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return undefined;
  };

  const handleRemoveImage = async (id: string) => {
    // Find the image to delete
    const imageToDelete = images.find(img => img.id === id);
    if (!imageToDelete || !projectId || !imageToDelete.numericId) {
      // Just remove from UI if we can't delete from server
      setImages(prevImages => prevImages.filter(img => img.id !== id));
      return;
    }

    try {
      setLoading(true);
      // Call API to delete from Redis
      await deleteProjectImage(projectId, imageToDelete.numericId);
      // Remove from UI state
      setImages(prevImages => prevImages.filter(img => img.id !== id));
    } catch (err) {
      console.error('Failed to delete image:', err);
      setError(err instanceof Error ? err.message : t('delete.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (imageItem: ImageItem) => {
    if (!imageItem.uploaded || !imageItem.numericId || !onImageSelected) return;
    
    let newSelectedIds: number[] = [];
    
    if (multiSelect) {
      // For multi-select: toggle the selected state for this image
      if (selectedImageIds.includes(imageItem.numericId)) {
        // Remove from selection if already selected
        newSelectedIds = selectedImageIds.filter(id => id !== imageItem.numericId);
      } else {
        // Add to selection if not already selected
        newSelectedIds = [...selectedImageIds, imageItem.numericId];
      }
    } else {
      // For single-select: just select this image
      newSelectedIds = [imageItem.numericId];
    }
    
    // Update selected state in UI
    setImages(prevImages => 
      prevImages.map(img => ({
        ...img,
        selected: img.numericId ? newSelectedIds.includes(img.numericId) : false
      }))
    );
    
    // Notify parent component
    onImageSelected(newSelectedIds);
  };

  const handleImageZoom = (src: string) => {
    setEnlargedImage(src);
  };

  const handleCloseEnlarged = () => {
    setEnlargedImage(null);
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
    <Box key={`gallery-${projectId || 'new'}`}>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {multiSelect && images.filter(img => img.selected).length > 0 && (
        <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
          {t('selected.images')}: {images.filter(img => img.selected).length}
        </Typography>
      )}

      <Grid container spacing={2}>
        {/* Display added images */}
        {images.map((image) => (
          <Grid key={image.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <ImageContainer 
              elevation={image.selected ? 4 : 2}
              sx={{
                border: image.selected ? '2px solid' : 'none',
                borderColor: 'primary.main',
                cursor: image.uploaded ? 'pointer' : 'default',
              }}
              onClick={() => image.uploaded && handleImageSelect(image)}
            >
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
                  '&:hover': {
                    opacity: 1,
                  }
                }}
              >
                {!image.uploaded ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpload(image);
                    }}
                    color="primary"
                    variant="contained"
                    disabled={loading && activeUpload === image.id}
                    startIcon={loading && activeUpload === image.id ? <CircularProgress size={20} /> : null}
                    sx={{ mb: 1 }}
                  >
                    {loading && activeUpload === image.id ? t('uploading') : t('upload')}
                  </Button>
                ) : (
                  <>
                    {image.selected && (
                      <CheckCircleIcon 
                        color="success" 
                        sx={{ 
                          fontSize: 28, 
                          mb: 1, 
                          bgcolor: 'white', 
                          borderRadius: '50%' 
                        }} 
                      />
                    )}
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
                  </>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(image.id);
                    }}
                    disabled={loading}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.5)',
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageZoom(image.src);
                    }}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.5)',
                      }
                    }}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              {image.selected && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    backgroundColor: 'primary.main',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircleIcon sx={{ color: 'white', fontSize: 18 }} />
                </Box>
              )}
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

      {/* Image Preview Dialog */}
      <Dialog
        open={!!enlargedImage}
        onClose={handleCloseEnlarged}
        maxWidth="xl"
        fullWidth
      >
        <IconButton
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
          onClick={handleCloseEnlarged}
        >
          <CloseIcon />
        </IconButton>
        {enlargedImage && (
          <Box
            component="img"
            src={enlargedImage}
            alt={t('image.preview')}
            sx={{
              maxWidth: '100%',
              maxHeight: '95vh',
              objectFit: 'contain',
            }}
          />
        )}
      </Dialog>
    </Box>
  );
} 