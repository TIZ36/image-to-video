'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { checkApiKeyStatus } from '../services/api.service';

interface ApiKeys {
  llm_api_key: string;
  tts_api_key: string;
  kling_access_key: string;
  kling_secret_key: string;
}

interface ApiKeyStatus {
  llm_configured: boolean;
  tts_configured: boolean;
  kling_configured: boolean;
}

interface ApiKeyContextProps {
  apiKeys: ApiKeys;
  keyStatus: ApiKeyStatus;
  loading: boolean;
  error: string | null;
  refreshApiKeys: () => Promise<void>;
}

const defaultApiKeys: ApiKeys = {
  llm_api_key: '',
  tts_api_key: '',
  kling_access_key: '',
  kling_secret_key: '',
};

const defaultKeyStatus: ApiKeyStatus = {
  llm_configured: false,
  tts_configured: false,
  kling_configured: false,
};

const ApiKeyContext = createContext<ApiKeyContextProps>({
  apiKeys: defaultApiKeys,
  keyStatus: defaultKeyStatus,
  loading: false,
  error: null,
  refreshApiKeys: async () => {},
});

export const useApiKeys = () => useContext(ApiKeyContext);

interface ApiKeyProviderProps {
  children: ReactNode;
}

export const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(defaultApiKeys);
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus>(defaultKeyStatus);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  const fetchApiKeys = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setApiKeys(defaultApiKeys);
      setKeyStatus(defaultKeyStatus);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch API keys
      const response = await fetch('/api/keys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // If unauthorized (401), just reset the keys - user might not be logged in
        if (response.status === 401) {
          setApiKeys(defaultApiKeys);
          setKeyStatus(defaultKeyStatus);
          return;
        }
        throw new Error(`Failed to fetch API keys: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.keys) {
        setApiKeys(data.keys);
      }
      
      try {
        // Check API key status
        const statusResponse = await checkApiKeyStatus();
        if (statusResponse.success) {
          setKeyStatus(statusResponse.status);
        }
      } catch (statusErr) {
        // If we can't get the status, infer it from the keys
        console.warn('Could not fetch API key status, inferring from keys');
        setKeyStatus({
          llm_configured: !!(data.keys?.llm_api_key),
          tts_configured: !!(data.keys?.tts_api_key),
          kling_configured: !!(data.keys?.kling_access_key && data.keys?.kling_secret_key)
        });
      }
    } catch (err: any) {
      console.error('Error fetching API keys:', err);
      setError(err.message || 'Failed to fetch API keys');
      // Set default values on error
      setApiKeys(defaultApiKeys);
      setKeyStatus(defaultKeyStatus);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    if (!initialized) {
      fetchApiKeys();
      setInitialized(true);
    }
  }, [initialized]);

  const refreshApiKeys = async () => {
    await fetchApiKeys();
  };

  const value = {
    apiKeys,
    keyStatus,
    loading,
    error,
    refreshApiKeys,
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyContext; 