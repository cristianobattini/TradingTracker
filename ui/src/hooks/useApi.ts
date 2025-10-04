// src/hooks/useApi.ts
import { getAuthHeaders } from '../lib/client-config';

export const useApi = () => {
  const withAuth = (options: any = {}) => ({
    ...options,
    headers: {
      ...options.headers,
      ...getAuthHeaders(),
    },
  });

  return {
    withAuth,
  };
};

// Usage in components:
// const { withAuth } = useApi();
// const response = await readUsersMeUsersMeGet(withAuth());