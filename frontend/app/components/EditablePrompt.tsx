import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Box, 
  Typography, 
  Paper,
  Button,
  InputAdornment,
  IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Tooltip from '@mui/material/Tooltip';

// Special marker pattern to identify editable sections: {{variable_name:default value}}
const EDITABLE_PATTERN = /\{\{([^:}]+)(?::([^}]+))?\}\}/g;

interface EditableField {
  id: string;          // Unique ID for the field (derived from variable name)
  label: string;       // Human-readable label (derived from variable name)
  defaultValue: string; // Default value (if provided)
  value: string;       // Current value
}

interface EditablePromptProps {
  promptTemplate: string;
  onProcessedPromptChange: (processedPrompt: string) => void;
}

/**
 * Component that handles editable sections in prompt templates
 * Parses templates with format {{variable_name:default value}} and renders input fields
 */
export default function EditablePrompt({ promptTemplate, onProcessedPromptChange }: EditablePromptProps) {
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);
  const [processedPrompt, setProcessedPrompt] = useState(promptTemplate);
  
  // Parse template on initial load or when template changes
  useEffect(() => {
    const fields: EditableField[] = [];
    let match;
    
    // Reset the regex to start from the beginning
    EDITABLE_PATTERN.lastIndex = 0;
    
    // Find all matches in the template
    while ((match = EDITABLE_PATTERN.exec(promptTemplate)) !== null) {
      const variableName = match[1].trim();
      const defaultValue = match[2]?.trim() || '';
      
      // Create a human-readable label from the variable name
      const label = variableName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      fields.push({
        id: variableName,
        label,
        defaultValue,
        value: defaultValue
      });
    }
    
    setEditableFields(fields);
    
    // Process the initial template
    processTemplate(fields);
  }, [promptTemplate]);
  
  // Process template by replacing markers with actual values
  const processTemplate = (fields: EditableField[]) => {
    let result = promptTemplate;
    
    fields.forEach(field => {
      const regex = new RegExp(`\\{\\{${field.id}(?::[^}]+)?\\}\\}`, 'g');
      result = result.replace(regex, field.value);
    });
    
    setProcessedPrompt(result);
    onProcessedPromptChange(result);
  };
  
  // Handle field value changes
  const handleFieldChange = (id: string, newValue: string) => {
    const updatedFields = editableFields.map(field => 
      field.id === id ? { ...field, value: newValue } : field
    );
    
    setEditableFields(updatedFields);
    processTemplate(updatedFields);
  };
  
  // Reset all fields to their default values
  const handleReset = () => {
    const resetFields = editableFields.map(field => ({
      ...field,
      value: field.defaultValue
    }));
    
    setEditableFields(resetFields);
    processTemplate(resetFields);
  };
  
  return (
    <Box>
      {editableFields.length > 0 ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              模板参数
              <Tooltip title="这些是模板中定义的可编辑字段，修改它们将自动更新提示词">
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              {editableFields.map(field => (
                <TextField
                  key={field.id}
                  label={field.label}
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  fullWidth
                  size="small"
                  margin="dense"
                  variant="outlined"
                />
              ))}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button 
                  size="small" 
                  onClick={handleReset}
                >
                  重置为默认值
                </Button>
              </Box>
            </Paper>
          </Box>
        </>
      ) : null}
    </Box>
  );
}

// Helper functions for working with editable prompts

/**
 * Creates a template variable marker with the given variable name and optional default value
 */
export function createTemplateVariable(variableName: string, defaultValue: string = ''): string {
  return `{{${variableName}${defaultValue ? ':' + defaultValue : ''}}}`;
}

/**
 * Checks if a prompt template contains editable sections
 */
export function hasEditableSections(template: string): boolean {
  EDITABLE_PATTERN.lastIndex = 0;
  return EDITABLE_PATTERN.test(template);
}

/**
 * Extracts all variable names from a template string
 */
export function extractVariableNames(template: string): string[] {
  const variables: string[] = [];
  let match;
  
  EDITABLE_PATTERN.lastIndex = 0;
  while ((match = EDITABLE_PATTERN.exec(template)) !== null) {
    variables.push(match[1].trim());
  }
  
  return variables;
} 