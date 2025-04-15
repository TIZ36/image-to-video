'use client';

import { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  IconButton, 
  TextField, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Divider,
  CircularProgress,
  ButtonBase,
  Menu,
  MenuItem,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import MovieIcon from '@mui/icons-material/Movie';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import { Project, createProject, deleteProject } from '../services/api.service';
import { formatDistanceToNow } from 'date-fns';

interface ProjectListProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onProjectCreated: (project: Project) => void;
  onProjectDeleted?: (projectId: string) => void;
  loading: boolean;
}

export default function ProjectList({ 
  projects, 
  selectedProject, 
  onProjectSelect,
  onProjectCreated,
  onProjectDeleted,
  loading 
}: ProjectListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    projectId: string;
    projectName: string;
  } | null>(null);
  
  // Delete confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [finalDeleteConfirmOpen, setFinalDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{id: string, name: string} | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setProjectName('');
    setProjectDescription('');
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setCreatingProject(true);
    setError(null);

    try {
      const result = await createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined
      });

      onProjectCreated(result.project);
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };
  
  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent, projectId: string, projectName: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      projectId,
      projectName,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleDeleteClick = () => {
    if (!contextMenu) return;
    
    setProjectToDelete({
      id: contextMenu.projectId,
      name: contextMenu.projectName,
    });
    setDeleteConfirmOpen(true);
    handleCloseContextMenu();
  };

  const handleFirstDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setFinalDeleteConfirmOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setFinalDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  const handleFinalDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    setDeletingProject(true);
    try {
      await deleteProject(projectToDelete.id);
      setFinalDeleteConfirmOpen(false);
      setProjectToDelete(null);
      
      // Notify parent component about deletion
      if (onProjectDeleted) {
        onProjectDeleted(projectToDelete.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeletingProject(false);
    }
  };

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 2,
        height: 'calc(100vh - var(--header-height) - 48px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'primary.main',
          color: 'white',
          flexShrink: 0
        }}
      >
        <Typography variant="h6">Projects</Typography>
        <IconButton 
          color="inherit" 
          onClick={handleOpenDialog}
          disabled={loading}
        >
          <AddIcon />
        </IconButton>
      </Box>

      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          px: 1,
          maxHeight: 'calc(100vh - var(--header-height) - 100px)',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '3px',
          }
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : projects.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No projects yet. Create your first project!
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />} 
              onClick={handleOpenDialog}
              sx={{ mt: 2 }}
            >
              Create Project
            </Button>
          </Box>
        ) : (
          <List>
            {projects.map((project) => (
              <Box key={project.id}>
                <ButtonBase 
                  onClick={() => onProjectSelect(project)}
                  onContextMenu={(e) => handleContextMenu(e, project.id, project.name)}
                  sx={{ 
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: selectedProject?.id === project.id ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: project.image_path ? 'primary.main' : 'grey.400',
                        }}
                      >
                        {project.image_path ? <ImageIcon /> : <InsertPhotoIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={project.name}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="textSecondary"
                          >
                            {formatDate(project.updated_at)}
                          </Typography>
                          <Box sx={{ display: 'flex', mt: 0.5 }}>
                            {project.image_path && (
                              <ImageIcon
                                fontSize="small"
                                color="action"
                                sx={{ mr: 0.5 }}
                              />
                            )}
                            {project.script && (
                              <DescriptionIcon
                                fontSize="small"
                                color="action"
                                sx={{ mr: 0.5 }}
                              />
                            )}
                            {project.video && project.video.url && (
                              <MovieIcon fontSize="small" color="action" />
                            )}
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                </ButtonBase>
                <Divider variant="inset" component="li" />
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* 新建项目对话框 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            error={!!error && !projectName.trim()}
            helperText={!projectName.trim() && error ? 'Project name is required' : ''}
            disabled={creatingProject}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            disabled={creatingProject}
          />
          {error && projectName.trim() && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={creatingProject}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained" 
            disabled={creatingProject || !projectName.trim()}
            startIcon={creatingProject ? <CircularProgress size={20} /> : null}
          >
            {creatingProject ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 右键菜单 */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Project
        </MenuItem>
      </Menu>
      
      {/* 第一次删除确认对话框 */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will delete the project and all associated data.
          </Alert>
          <Typography>
            Are you sure you want to delete project "{projectToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button 
            onClick={handleFirstDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 最终删除确认对话框 */}
      <Dialog
        open={finalDeleteConfirmOpen}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Final Confirmation</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you ABSOLUTELY sure you want to permanently delete project "{projectToDelete?.name}" and all its data?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button 
            onClick={handleFinalDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deletingProject}
            startIcon={deletingProject ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deletingProject ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
} 