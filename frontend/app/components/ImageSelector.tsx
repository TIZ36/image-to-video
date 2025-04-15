'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Paper,
  styled,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Dialog,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { getProjectImages, ProjectImage } from '../services/api.service';
import { useLanguage } from '../contexts/LanguageContext';

// Increase the padTop to create a larger aspect ratio for the images
const ImageContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  height: 0,
  paddingTop: '180%', // Increased from 120% for taller images
  width: '200%',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}));

interface ImageSelectorProps {
  projectId: string;
  onImageSelected: (imageId: number) => void;
  selectedImageId?: number;
}

export default function ImageSelector({ projectId, onImageSelected, selectedImageId }: ImageSelectorProps) {
  const { t } = useLanguage();
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | undefined>(selectedImageId);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await getProjectImages(projectId);
        setImages(response.images);
        
        // 如果没有选中的图片，默认选择第一张
        if (!selectedImage && response.images.length > 0) {
          setSelectedImage(response.images[0].id);
          onImageSelected(response.images[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch project images:', error);
        setError(t('load.failed'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, [projectId, selectedImage, onImageSelected, t]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageId = Number(event.target.value);
    setSelectedImage(imageId);
    onImageSelected(imageId);
  };

  const handleImageClick = (imagePath: string) => {
    setEnlargedImage(`http://localhost:8888${imagePath}`);
  };

  const handleCloseEnlarged = () => {
    setEnlargedImage(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2">
        {error}
      </Typography>
    );
  }

  if (images.length === 0) {
    return (
      <Typography color="textSecondary" variant="body2">
        {t('no.images')}
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('select.image')}:
      </Typography>
      
      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <RadioGroup 
          value={selectedImage} 
          onChange={handleImageChange}
          sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}
        >
          <Grid container spacing={3}>
            {images.map((image) => (
              <Grid key={image.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControlLabel
                  value={image.id}
                  control={<Radio />}
                  label=""
                  sx={{
                    m: 0,
                    width: '100%',
                    '& .MuiFormControlLabel-label': { width: '100%' }
                  }}
                />
                <ImageContainer 
                  elevation={selectedImage === image.id ? 4 : 1}
                  onClick={() => handleImageClick(image.path)}
                  sx={{ 
                    border: selectedImage === image.id ? '2px solid' : '1px solid',
                    borderColor: selectedImage === image.id ? 'primary.main' : 'divider',
                    position: 'relative',
                  }}
                >
                  <Box
                    component="img"
                    src={`http://localhost:8888${image.path}`}
                    alt={`${t('select.image')} ${image.id}`}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '50%',
                      padding: '2px',
                    }}
                  >
                    <ZoomInIcon fontSize="small" color="primary" />
                  </Box>
                </ImageContainer>
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </FormControl>

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
            alt={t('select.image')}
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