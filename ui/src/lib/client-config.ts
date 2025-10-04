// src/lib/client-config.ts
import { getLocalStorageItem } from '../services/local-storage-service';

// This function will be used to get the auth headers for API calls
export const getAuthHeaders = (): HeadersInit => {
  const token = getLocalStorageItem('accessToken');
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
  return {};
};

// Create a custom fetch function that automatically includes the auth token
export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const authHeaders = getAuthHeaders();
  
  const config: RequestInit = {
    ...init,
    headers: {
      ...init?.headers,
      ...authHeaders,
    },
  };

  return fetch(input, config);
};