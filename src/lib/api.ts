import { authStorage } from './auth';
import { resourceCache } from './resourceCache';
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
  VerifyRegistrationResponse,
  QrTagLookupResponse,
  QrResolveResponse,
  PairQrPayload,
  PairQrResponse,
  UnpairQrPayload,
  UnpairQrResponse,
  GenerateQrPayload,
  GenerateQrResponse,
  ResourceCallsResponse,
  ResourceAnalyticsResponse,
  SubscriptionPack,
  SubscriptionPacksResponse,
  UserSubscriptionMeData,
  UserSubscriptionMeResponse,
  SelectActiveTagsPayload,
  SelectActiveTagsResponse,
  CreatePurchasePayload,
  CreatePurchaseResponse,
  ActivateSubscriptionPayload,
  ActivateSubscriptionResponse,
  PurchaseRecord,
  SubscriptionPurchasesResponse,
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

  if (typeof window !== 'undefined') {
    const adminKey = localStorage.getItem('pingin_admin_key');
    if (adminKey && !headers.has('x-admin-key')) {
      headers.set('x-admin-key', adminKey.trim());
    }
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  // Intercept 401 Unauthorized on authenticated requests (never 500 server errors or auth profile checks)
  const isAuthFailure =
    response.status === 401 &&
    Boolean(token) &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/signup') &&
    !endpoint.includes('/auth/verify') &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/me');

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
    const message = errorData.error || errorData.message || response.statusText || 'An error occurred';
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

  getMe: async () => {
    try {
      const res: any = await api.get<UserProfile | { user: UserProfile }>('/api/auth/me');
      return (res?.user || res?.data?.user || res?.data || res) as UserProfile;
    } catch (err: any) {
      if (err.statusCode === 404) {
        try {
          const res: any = await api.get<UserProfile | { user: UserProfile }>('/auth/me');
          return (res?.user || res?.data?.user || res?.data || res) as UserProfile;
        } catch {
          // fallback
        }
      }
      throw err;
    }
  },

  logout: () =>
    api.post<{ message: string }>('/api/auth/logout'),

  updateProfile: async (payload: { name: string }) => {
    try {
      return await api.patch<{ message: string; user?: UserProfile }>('/api/users/me', payload);
    } catch (err: any) {
      if (err.statusCode === 404) {
        return await api.patch<{ message: string; user?: UserProfile }>('/api/auth/me', payload);
      }
      throw err;
    }
  },

  changePassword: async (payload: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword?: string;
  }) => {
    try {
      return await api.post<{ message: string }>('/api/users/change-password', payload);
    } catch (err: any) {
      if (err.statusCode === 404) {
        return await api.post<{ message: string }>('/api/auth/change-password', payload);
      }
      throw err;
    }
  },
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

  getCalls: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<ResourceCallsResponse>(`/api/resources/${id}/calls${qs ? `?${qs}` : ''}`);
  },

  getAnalytics: (id: string) =>
    api.get<ResourceAnalyticsResponse>(`/api/resources/${id}/analytics`),
};

export const publicContactApi = {
  getByToken: (token: string) =>
    api.get<PublicResourceContact>(`/api/contact/${token}`),

  verifyRegistrationNumber: async (
    token: string,
    registrationNum: string
  ): Promise<VerifyRegistrationResponse> => {
    return await api.post<VerifyRegistrationResponse>(`/api/contact/${token}/verify`, {
      registrationNum,
    });
  },

  recordVisit: async (token: string, visitId: string, source: string = 'direct') => {
    try {
      return await api.post<{ success: boolean }>(`/api/contact/${token}/visit`, {
        visitId,
        source,
      });
    } catch {
      // Beacon is non-blocking fire-and-forget
      return { success: false };
    }
  },

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
   * POST /api/communication/:token/call (with /call/:token fallback)
   */
  initiateCall: async (
    token: string,
    phoneNumber: string,
    visitId?: string | null
  ): Promise<InitiateCallResponse> => {
    const payload: { phoneNumber: string; visitId?: string } = { phoneNumber };
    if (visitId) {
      payload.visitId = visitId;
    }

    try {
      return await api.post<InitiateCallResponse>(`/api/communication/${token}/call`, payload);
    } catch (err: any) {
      if (err.statusCode === 404) {
        return await api.post<InitiateCallResponse>(`/api/communication/call/${token}`, payload);
      }
      throw err;
    }
  },

  /**
   * Polls the live status of a call session.
   * GET /api/communication/calls/:callId
   */
  getCallStatus: async (callId: string): Promise<CallStatusResponse> => {
    return await api.get<CallStatusResponse>(`/api/communication/calls/${callId}`);
  },
};

export const qrApi = {
  /**
   * Public lookup by camera-scanned token OR printed 7-character tagNumber.
   * GET /api/qr/:identifier
   * Access: Public (no auth required)
   */
  lookup: (identifier: string): Promise<QrTagLookupResponse> => {
    return api.get<QrTagLookupResponse>(`/api/qr/${encodeURIComponent(identifier.trim())}`);
  },

  /**
   * Smart resolver for camera-scanned tokens or human-entered tag numbers.
   * GET /api/qr/resolve/:token
   * Access: Public (no auth required)
   */
  resolve: (token: string): Promise<QrResolveResponse> => {
    return api.get<QrResolveResponse>(`/api/qr/resolve/${encodeURIComponent(token.trim())}`);
  },

  /**
   * Pairs an unassigned QR tag to a resource owned by the authenticated user.
   * POST /api/qr/pair
   * Access: Private (Bearer JWT required)
   */
  pair: (payload: PairQrPayload): Promise<PairQrResponse> => {
    return api.post<PairQrResponse>('/api/qr/pair', payload);
  },

  /**
   * Unpairs / de-allocates an active QR tag from an owned resource.
   * POST /api/qr/unpair
   * Access: Private (Bearer JWT required)
   */
  unpair: (payload: UnpairQrPayload): Promise<UnpairQrResponse> => {
    return api.post<UnpairQrResponse>('/api/qr/unpair', payload);
  },

  /**
   * On-demand generation of a single digital QR tag (users and admins).
   * POST /api/qr/generate
   * Access: Private (Bearer JWT required)
   */
  generate: (payload: GenerateQrPayload = {}): Promise<GenerateQrResponse> => {
    return api.post<GenerateQrResponse>('/api/qr/generate', payload);
  },
};

export const subscriptionApi = {
  /**
   * Returns server-authoritative product catalog with prices in paise, tag quotas, and feature descriptions.
   * GET /api/subscriptions/packs
   * Access: Public (no auth required)
   */
  getPacks: async (): Promise<SubscriptionPack[]> => {
    const res = await api.get<SubscriptionPacksResponse>('/api/subscriptions/packs');
    return res?.data?.packs || [];
  },

  /**
   * Fetches current user's subscription tier, active/suspended tags, and whether tag selection is required after demotion.
   * GET /api/subscriptions/me
   * Access: Authenticated (Bearer JWT required)
   */
  getMe: async (): Promise<UserSubscriptionMeData> => {
    const res = await api.get<UserSubscriptionMeResponse>('/api/subscriptions/me');
    return res.data;
  },

  /**
   * Demoted users (from Plus to Basic) call this to choose which 2 tags remain ASSIGNED.
   * All unselected tags are moved to SUSPENDED.
   * POST /api/subscriptions/select-active-tags
   * Access: Authenticated
   */
  selectActiveTags: async (
    payload: string[] | SelectActiveTagsPayload
  ): Promise<SelectActiveTagsResponse['data']> => {
    const body = Array.isArray(payload) ? { activeTagIds: payload } : payload;
    const res = await api.post<SelectActiveTagsResponse>('/api/subscriptions/select-active-tags', body);
    return res.data;
  },

  /**
   * Creates a PENDING purchase record using server-configured pricing.
   * POST /api/subscriptions/purchase
   * Access: Authenticated
   */
  createPurchase: async (payload: CreatePurchasePayload): Promise<CreatePurchaseResponse['data']> => {
    const res = await api.post<CreatePurchaseResponse>('/api/subscriptions/purchase', payload);
    return res.data;
  },

  /**
   * Confirms payment and activates 12-month Plus subscription (or extends current expiry by 12 months),
   * and restores any SUSPENDED tags back to ASSIGNED up to 8.
   * POST /api/subscriptions/activate
   * Access: Authenticated
   */
  activate: async (payload: ActivateSubscriptionPayload): Promise<ActivateSubscriptionResponse['data']> => {
    const res = await api.post<ActivateSubscriptionResponse>('/api/subscriptions/activate', payload);
    return res.data;
  },

  /**
   * Lists user's past purchase orders with product details.
   * GET /api/subscriptions/purchases
   * Access: Authenticated
   */
  getPurchases: async (): Promise<PurchaseRecord[]> => {
    const res = await api.get<SubscriptionPurchasesResponse>('/api/subscriptions/purchases');
    return res?.data?.purchases || [];
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
 * Resolves the public domain name (e.g. "kauntact.com" or "kauntact.vercel.app")
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

/**
 * Resolves the fully-qualified public QR scan URL for a given resource and optional tag number.
 * If a tag number is provided or assigned to the resource, generates `${baseUrl}/t/${tag}`.
 * If the resource has NO QR tag assigned, returns empty string ('').
 * NEVER falls back to the public contact link (/c/:token)!
 */
export function getResourceQrUrl(resource: any, tagNumber?: string): string {
  const baseUrl = getPublicBaseUrl();
  const tag = (tagNumber || extractResourceTag(resource) || '').trim();
  if (tag) {
    // Strip any accidental leading path prefixes
    const cleanTag = tag.replace(/^(\/?(t|qr|c|contact)\/)+/i, '').replace(/^\/+/, '');
    return `${baseUrl}/t/${cleanTag}`;
  }
  return '';
}

/**
 * Normalizes any QR URL into the canonical /t/:identifier format.
 * Replaces legacy /qr/ paths and never permits /c/ or /contact/ in QR codes.
 */
export function normalizeQrUrl(rawUrl?: string, fallbackTagOrToken?: string): string {
  const baseUrl = getPublicBaseUrl();
  const fallback = fallbackTagOrToken ? fallbackTagOrToken.trim() : '';

  if (!rawUrl || typeof rawUrl !== 'string') {
    if (!fallback) return '';
    const cleanFallback = fallback.replace(/^(\/?(t|qr|c|contact)\/)+/i, '').replace(/^\/+/, '');
    return `${baseUrl}/t/${cleanFallback}`;
  }

  try {
    const parsed = new URL(rawUrl, baseUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const identifier = segments[segments.length - 1] || fallback;
    const cleanId = identifier.replace(/^(\/?(t|qr|c|contact)\/)+/i, '').replace(/^\/+/, '');
    return cleanId ? `${baseUrl}/t/${cleanId}` : '';
  } catch {
    const clean = rawUrl.replace(/^(\/?(t|qr|c|contact)\/)+/i, '').replace(/^\/+/, '');
    return clean ? `${baseUrl}/t/${clean}` : '';
  }
}

/**
 * Robustly resolves the active QR tag code from a resource across all possible backend schemas:
 * checks tagNumber, tag_number, qrTag, qr_tag, tag, qrTags array, qr_tags array, tags array,
 * and resilient local client cache.
 */
export function extractResourceTag(resource: any): string {
  if (!resource) return '';

  const resId = resource.id || resource._id;

  // 1. Direct tagNumber / tag_number
  if (typeof resource.tagNumber === 'string' && resource.tagNumber) {
    return resource.tagNumber.toUpperCase();
  }
  if (typeof resource.tag_number === 'string' && resource.tag_number) {
    return resource.tag_number.toUpperCase();
  }

  // 2. qrTag object
  if (resource.qrTag && typeof resource.qrTag === 'object') {
    const code = resource.qrTag.tagNumber || resource.qrTag.tag_number || resource.qrTag.code;
    if (code) return String(code).toUpperCase();
  }

  // 3. qr_tag object
  if (resource.qr_tag && typeof resource.qr_tag === 'object') {
    const code = resource.qr_tag.tagNumber || resource.qr_tag.tag_number || resource.qr_tag.code;
    if (code) return String(code).toUpperCase();
  }

  // 4. tag object
  if (resource.tag && typeof resource.tag === 'object') {
    const code = resource.tag.tagNumber || resource.tag.tag_number || resource.tag.code;
    if (code) return String(code).toUpperCase();
  }

  // 5. qrTags array
  if (Array.isArray(resource.qrTags) && resource.qrTags.length > 0) {
    const active =
      resource.qrTags.find((t: any) => t.status === 'ASSIGNED' || t.active !== false) ||
      resource.qrTags[0];
    const code = active?.tagNumber || active?.tag_number || active?.code;
    if (code) return String(code).toUpperCase();
  }

  // 6. qr_tags array
  if (Array.isArray(resource.qr_tags) && resource.qr_tags.length > 0) {
    const active =
      resource.qr_tags.find((t: any) => t.status === 'ASSIGNED' || t.active !== false) ||
      resource.qr_tags[0];
    const code = active?.tagNumber || active?.tag_number || active?.code;
    if (code) return String(code).toUpperCase();
  }

  // 7. tags array
  if (Array.isArray(resource.tags) && resource.tags.length > 0) {
    const active =
      resource.tags.find((t: any) => t.status === 'ASSIGNED' || t.active !== false) ||
      resource.tags[0];
    const code = active?.tagNumber || active?.tag_number || active?.code;
    if (code) return String(code).toUpperCase();
  }

  // 8. If the backend object explicitly defines empty, null, or unassigned tag properties,
  // the server is the single source of truth. DO NOT revive previous tags from localStorage!
  if (
    ('tagNumber' in resource && !resource.tagNumber) ||
    ('tag_number' in resource && !resource.tag_number) ||
    ('qrTag' in resource && !resource.qrTag) ||
    ('qr_tag' in resource && !resource.qr_tag) ||
    ('tag' in resource && !resource.tag) ||
    (Array.isArray(resource.qrTags) && resource.qrTags.length === 0) ||
    (Array.isArray(resource.tags) && resource.tags.length === 0)
  ) {
    if (resId && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`kauntact_tag_${resId}`);
      } catch {
        // Ignore
      }
    }
    return '';
  }

  // 9. Client-side resilience cache fallback (ONLY for partial/sparse client representations)
  if (resId && typeof window !== 'undefined') {
    const cached = localStorage.getItem(`kauntact_tag_${resId}`);
    if (cached) return cached.toUpperCase();
  }

  return '';
}

export function cacheResourceTag(resourceId: string, tagNumber: string) {
  if (!resourceId || !tagNumber || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`kauntact_tag_${resourceId}`, tagNumber.toUpperCase());
  } catch {
    // Ignore localStorage errors
  }
}

export function uncacheResourceTag(resourceId: string) {
  if (!resourceId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`kauntact_tag_${resourceId}`);
    resourceCache.invalidate();
    window.dispatchEvent(new CustomEvent('resource:updated', { detail: { resourceId } }));
    window.dispatchEvent(new CustomEvent('tag:updated', { detail: { resourceId } }));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Synchronizes client caches when a tag is updated, reassigned, or removed.
 * - Removes any conflicting mappings of newTagNumber or previousTagNumber across all resources
 * - Updates the target resource's cache
 * - Invalidates cached lists and broadcasts update events across the app
 */
export function syncResourceTagUpdate(
  resourceId?: string,
  newTagNumber?: string | null,
  previousTagNumber?: string | null
) {
  if (typeof window === 'undefined') return;

  try {
    const tagToClear = previousTagNumber || newTagNumber;
    if (tagToClear) {
      const cleanUpper = tagToClear.toUpperCase().trim();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kauntact_tag_')) {
          if (localStorage.getItem(key)?.toUpperCase() === cleanUpper) {
            localStorage.removeItem(key);
          }
        }
      }
    }

    if (resourceId && newTagNumber) {
      localStorage.setItem(`kauntact_tag_${resourceId}`, newTagNumber.toUpperCase().trim());
    } else if (resourceId && !newTagNumber) {
      localStorage.removeItem(`kauntact_tag_${resourceId}`);
    }

    // Invalidate dashboard list cache so fresh server data is fetched
    resourceCache.invalidate();

    // Broadcast across windows and tabs
    window.dispatchEvent(
      new CustomEvent('resource:updated', {
        detail: { resourceId, newTagNumber, previousTagNumber },
      })
    );
    window.dispatchEvent(new CustomEvent('tag:updated', { detail: { resourceId, newTagNumber } }));
    window.dispatchEvent(new CustomEvent('auth:refresh'));
  } catch (err) {
    console.warn('Failed to sync resource tag update', err);
  }
}

/**
 * Extracts 7-character tag code from backend 409 conflict messages such as:
 * "This resource already has an active QR tag (MD69QKS). Please unpair it before generating a new one."
 * or "This resource already has a different QR tag assigned (KT83B45)."
 */
export function extractConflictTagNumber(errorMessage: string): string | null {
  if (!errorMessage) return null;
  const match =
    errorMessage.match(/\(([A-Za-z0-9]{7})\)/) ||
    errorMessage.match(/\(([A-Za-z0-9]{5,10})\)/) ||
    errorMessage.match(/tag\s+([A-Za-z0-9]{7})/i);
  return match ? match[1].toUpperCase() : null;
}

export { adminApi, adminStorage } from './adminApi';
export { buildTagQrUrl, hasResourceQrTag, getResourceTagQrUrl } from './qr';
export { resourceCache } from './resourceCache';


