import { useAuth } from './useAuth';
import { getApiErrorMessage } from '~/utils/api-errors';

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  query?: Record<string, string | number | undefined>;
  onError?: (error: unknown) => void;
};

export const useApi = () => {
  const auth = useAuth();
  const runtimeConfig = useRuntimeConfig();

  const baseUrl = computed(() => (runtimeConfig.public.apiBaseUrl || '').replace(/\/$/, ''));
  const isConfigured = computed(() => Boolean(baseUrl.value));

  const getAuthToken = async (): Promise<string> => {
    const token = await auth.getIdToken();
    if (!token) {
      throw new Error('Sign in again before continuing.');
    }
    return token;
  };

  const fetch = async <T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> => {
    if (!isConfigured.value) {
      throw new Error('Set NUXT_PUBLIC_API_BASE_URL before making API requests.');
    }

    const token = await getAuthToken();
    const url = `${baseUrl.value}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    return await $fetch<T>(url, {
      method: options.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}` },
      body: options.body,
      query: options.query,
    });
  };

  const safeFetch = async <T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<{ data: T | null; error: string | null }> => {
    try {
      const data = await fetch<T>(endpoint, options);
      return { data, error: null };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Request failed.');
      options.onError?.(error);
      return { data: null, error: message };
    }
  };

  const fetchRaw = async (
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<Response> => {
    if (!isConfigured.value) {
      throw new Error('Set NUXT_PUBLIC_API_BASE_URL before making API requests.');
    }

    const token = await getAuthToken();
    const url = `${baseUrl.value}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    return await globalThis.fetch(url, {
      method: options.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return {
    baseUrl,
    isConfigured,
    getAuthToken,
    fetch,
    safeFetch,
    fetchRaw,
  };
};
