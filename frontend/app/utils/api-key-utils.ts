import { useApiKeys } from '../contexts/ApiKeyContext';

/**
 * Custom hook to check if the necessary API keys are set
 * @param keyTypes Array of key types to check ('llm', 'tts', 'kling')
 * @returns Object with isReady boolean and missingKeys array
 */
export function useApiKeyValidation(keyTypes: ('llm' | 'tts' | 'kling')[]) {
  const { keyStatus } = useApiKeys();
  
  const missingKeys: ('llm' | 'tts' | 'kling')[] = [];
  
  if (keyTypes.includes('llm') && !keyStatus?.llm_configured) {
    missingKeys.push('llm');
  }
  
  if (keyTypes.includes('tts') && !keyStatus?.tts_configured) {
    missingKeys.push('tts');
  }
  
  if (keyTypes.includes('kling') && !keyStatus?.kling_configured) {
    missingKeys.push('kling');
  }
  
  return {
    isReady: missingKeys.length === 0,
    missingKeys
  };
}

/**
 * Gets a user-friendly name for a key type
 * @param keyType The key type
 * @returns A user-friendly name for the key type
 */
export function getKeyTypeName(keyType: 'llm' | 'tts' | 'kling'): string {
  switch (keyType) {
    case 'llm':
      return 'LLM API密钥';
    case 'tts':
      return '语音合成API密钥';
    case 'kling':
      return '视频生成API密钥 (AK/SK)';
    default:
      return '未知API密钥';
  }
}

/**
 * Gets missing key names as a formatted string
 * @param missingKeys Array of missing key types
 * @returns A formatted string of missing key names
 */
export function getMissingKeysMessage(missingKeys: ('llm' | 'tts' | 'kling')[]): string {
  if (missingKeys.length === 0) return '';
  
  const keyNames = missingKeys.map(getKeyTypeName);
  
  if (keyNames.length === 1) {
    return `缺少 ${keyNames[0]}`;
  }
  
  return `缺少 ${keyNames.join('、')}`;
} 