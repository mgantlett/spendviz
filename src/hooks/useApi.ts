import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useApi() {
  const { token, logout } = useAuth();

  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    // Only set Content-Type to application/json if no body or body is not FormData
    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid, logout user
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  }, [token, logout]);

  return { apiCall };
}