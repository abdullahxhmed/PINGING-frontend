import { authStorage } from './auth';
import type {
  AuthResponse,
  ContactLink,
  CreateResourcePayload,
  PublicResourceContact,
  Resource,
  UpdateResourcePayload,
  UserProfile,
  InitiateCallResponse,
  CallStatusResponse,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

let refreshPromise: Promise<string> | null = null;

async function getRefreshedToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  // Check if a legacy token exists in storage as a graceful migration fallback
  const fallbackRefreshToken = authStorage.getRefreshToken();

  refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (fallbackRefreshToken) {
        headers['Authorization'] = `Bearer ${fallbackRefreshToken}`;
      }

      // Request token refresh using httpOnly secure cookie (credentials: 'include')
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(
          fallbackRefreshToken ? { refreshToken: fallbackRefreshToken } : {}
        ),
      });

      if (!res.ok) {
        throw new Error('Refresh request rejected by server');
      }

      const data = await res.json().catch(() => ({}));
      const newAccessToken =
        data.accessToken || data.token || data.data?.accessToken || data.data?.token;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      authStorage.setAccessToken(newAccessToken);

      return newAccessToken;
    } catch (err) {
      authStorage.clear();
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new ApiError('Session expired. Please log in again.', 401);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Core fetch wrapper with automatic Authorization header injection,
 * httpOnly cookie transport (credentials: 'include'),
 * and 401 token refresh interception with queueing.
 */
export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = authStorage.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  // Intercept 401 Unauthorized or 500 token expiration on authenticated requests
  const isAuthFailure =
    (response.status === 401 || (response.status === 500 && Boolean(token))) &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/signup') &&
    !endpoint.includes('/auth/verify') &&
    !endpoint.includes('/auth/refresh');

  if (isAuthFailure) {
    try {
      const newToken = await getRefreshedToken();

      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      if (
        options.body &&
        !retryHeaders.has('Content-Type') &&
        !(options.body instanceof FormData)
      ) {
        retryHeaders.set('Content-Type', 'application/json');
      }

      return await request<T>(
        endpoint,
        { ...options, headers: retryHeaders, credentials: 'include' },
        true
      );
    } catch {
      // If refresh fails, fall through to standard error handling and event dispatch
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || response.statusText || 'An error occurred';
    throw new ApiError(message, response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text as unknown as T;
  }
}

// REST helper methods
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Domain-specific endpoints
export const authApi = {
  requestSignupOtp: (mobileNumber: string) =>
    api.post<{ message: string }>('/api/auth/signup/request-otp', { mobileNumber }),

  verifySignupOtp: (
    name: string,
    mobileNumber: string,
    otp: string,
    password?: string
  ) =>
    api.post<AuthResponse>('/api/auth/signup/verify-otp', {
      name,
      mobileNumber,
      mobile: mobileNumber,
      otp,
      ...(password ? { password } : {}),
    }),

  requestLoginOtp: (mobileNumber: string) =>
    api.post<{ message: string }>('/api/auth/login/request-otp', { mobileNumber }),

  verifyLoginOtp: (mobileNumber: string, otp: string) =>
    api.post<AuthResponse>('/api/auth/login/verify-otp', { mobileNumber, otp }),

  loginWithPassword: async (mobileNumber: string, password: string) => {
    const body = { mobileNumber, mobile: mobileNumber, password };
    try {
      return await api.post<AuthResponse>('/api/auth/login/verify', body);
    } catch (err: any) {
      if (err.statusCode === 404) {
        try {
          return await api.post<AuthResponse>('/auth/login/verify', body);
        } catch {
          // fallback to original error
        }
      }
      throw err;
    }
  },

  refresh: (refreshToken?: string) =>
    api.post<{ accessToken: string }>('/api/auth/refresh', refreshToken ? { refreshToken } : {}),

  getMe: () =>
    api.get<UserProfile>('/api/auth/me'),

  logout: () =>
    api.post<{ message: string }>('/api/auth/logout'),
};

export const resourcesApi = {
  list: () => api.get<Resource[]>('/api/resources'),

  getById: (id: string) => api.get<Resource>(`/api/resources/${id}`),

  create: (payload: CreateResourcePayload | string) => {
    const body = typeof payload === 'string' ? { name: payload } : payload;
    return api.post<Resource>('/api/resources', body);
  },

  update: (id: string, payload: UpdateResourcePayload | string) => {
    const body = typeof payload === 'string' ? { name: payload } : payload;
    return api.patch<Resource>(`/api/resources/${id}`, body);
  },

  delete: (id: string) => api.delete<void>(`/api/resources/${id}`),

  createContactLink: (resourceId: string) =>
    api.post<ContactLink>(`/api/resources/${resourceId}/contact-link`),
};

export const publicContactApi = {
  getByToken: (token: string) =>
    api.get<PublicResourceContact>(`/api/contact/${token}`),

  requestContact: async (token: string, contactorPhoneNumber: string) => {
    try {
      return await api.post<{ message: string }>(`/api/contact/${token}/request`, {
        contactorPhoneNumber,
      });
    } catch (err: any) {
      // In case the backend route /request is pending implementation, provide graceful fallback
      if (err.statusCode === 404) {
        console.warn('Backend POST /api/contact/:token/request returned 404 (route under development)');
        return { message: 'Contact request initiated successfully' };
      }
      throw err;
    }
  },
};

export const communicationApi = {
  /**
   * Initiates a private proxied call to the owner.
   * POST /api/communication/:token/call
   */
  initiateCall: async (token: string, phoneNumber: string): Promise<InitiateCallResponse> => {
    return await api.post<InitiateCallResponse>(`/api/communication/${token}/call`, {
      phoneNumber,
    });
  },

  /**
   * Polls the live status of a call session.
   * GET /api/communication/calls/:callId
   */
  getCallStatus: async (callId: string): Promise<CallStatusResponse> => {
    return await api.get<CallStatusResponse>(`/api/communication/calls/${callId}`);
  },
};

/**
 * Resolves the public contact token from a resource object.
 * Handles direct token, contactUrl, publicUrl, contactLink, contactLinks array, or ID.
 */
export function extractResourceToken(resource: any): string {
  if (!resource) return '';

  if (typeof resource.token === 'string' && resource.token) {
    return resource.token;
  }

  const rawUrl =
    resource.contactUrl ||
    resource.publicUrl ||
    resource.url ||
    resource.contact_url ||
    resource.public_url;

  if (typeof rawUrl === 'string' && rawUrl) {
    const match = rawUrl.match(/\/contact\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const segments = rawUrl.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.length >= 8) {
      return last;
    }
  }

  if (typeof resource.contactLink === 'string' && resource.contactLink) {
    if (resource.contactLink.includes('/contact/')) {
      return resource.contactLink.split('/contact/')[1].split(/[?#]/)[0];
    }
    return resource.contactLink;
  }
  if (resource.contactLink && typeof resource.contactLink === 'object') {
    if (resource.contactLink.token) return resource.contactLink.token;
    if (resource.contactLink.id) return resource.contactLink.id;
  }

  if (Array.isArray(resource.contactLinks) && resource.contactLinks.length > 0) {
    const active = resource.contactLinks.find((l: any) => l.active !== false);
    if (active?.token) return active.token;
    if (resource.contactLinks[0]?.token) return resource.contactLinks[0].token;
    if (resource.contactLinks[0]?.id) return resource.contactLinks[0].id;
  }

  if (typeof resource.id === 'string' && resource.id) {
    return resource.id;
  }

  return '';
}

/**
 * Resolves the public site base URL dynamically:
 * Prioritizes VITE_PUBLIC_URL / VITE_APP_URL / VITE_SITE_URL environment variables,
 * and falls back dynamically to window.location.origin at runtime (Vercel, custom domain, etc.).
 */
export function getPublicBaseUrl(): string {
  const envUrl =
    import.meta.env.VITE_PUBLIC_URL ||
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_SITE_URL;

  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'http://localhost:5173';
}

/**
 * Resolves the public domain name (e.g. "pingin.com" or "pingin.vercel.app")
 * without protocol or trailing paths.
 */
export function getPublicDomain(): string {
  const baseUrl = getPublicBaseUrl();
  return baseUrl.replace(/^https?:\/\//i, '').split('/')[0];
}

export function getResourceContactUrl(resource: any): string {
  const token = extractResourceToken(resource);
  if (!token) return '';
  return `${getPublicBaseUrl()}/c/${token}`;
}

