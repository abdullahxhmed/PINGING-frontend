import { request } from './api';
import type {
  AdminDashboardData,
  AdminUsersResponse,
  AdminUserDetail,
  AdminQrSummary,
  AdminQrTagsResponse,
  AdminGenerateSingleQrPayload,
  AdminGenerateSingleQrResponse,
  AdminBatchQrPayload,
  AdminBatchQrResponse,
  AdminRevokeQrResponse,
  AdminCommunicationsResponse,
} from '../types/admin';

export const adminStorage = {
  getAdminKey: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pingin_admin_key');
  },
  setAdminKey: (key: string): void => {
    if (typeof window === 'undefined') return;
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('pingin_admin_key', trimmed);
    } else {
      localStorage.removeItem('pingin_admin_key');
    }
  },
  clearAdminKey: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('pingin_admin_key');
  },
};

/**
 * Builds custom admin headers including x-admin-key if present
 */
function getAdminHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  const adminKey = adminStorage.getAdminKey();
  if (adminKey) {
    headers['x-admin-key'] = adminKey;
  }
  return headers;
}

export const adminApi = {
  /**
   * High-level system overview snapshot
   */
  getDashboard: async (): Promise<AdminDashboardData> => {
    return request<AdminDashboardData>('/api/admin/dashboard', {
      headers: getAdminHeaders(),
    });
  },

  /**
   * Paginated list of all users with search and active status filter
   */
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<AdminUsersResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) query.set('search', params.search.trim());
    if (params?.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));

    const queryString = query.toString();
    const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;
    return request<AdminUsersResponse>(endpoint, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * Detailed single user information including contact endpoint and resources
   */
  getUserById: async (userId: string): Promise<AdminUserDetail> => {
    return request<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * QR inventory summary counts (total, assigned, unassigned, revoked, origins)
   */
  getQrSummary: async (): Promise<AdminQrSummary> => {
    return request<AdminQrSummary>('/api/admin/qr/summary', {
      headers: getAdminHeaders(),
    });
  },

  /**
   * Paginated QR tag inventory list
   */
  getQrTags: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    origin?: string;
  }): Promise<AdminQrTagsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.origin && params.origin !== 'ALL') query.set('origin', params.origin);

    const queryString = query.toString();
    const endpoint = `/api/admin/qr/tags${queryString ? `?${queryString}` : ''}`;
    return request<AdminQrTagsResponse>(endpoint, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * Generate a single QR tag, optionally pre-assigning to a resource
   */
  generateSingleQr: async (
    payload: AdminGenerateSingleQrPayload
  ): Promise<AdminGenerateSingleQrResponse> => {
    return request<AdminGenerateSingleQrResponse>('/api/admin/qr/generate', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * Batch-generate preprinted QR sticker inventory
   */
  generateBatchQr: async (
    payload: AdminBatchQrPayload
  ): Promise<AdminBatchQrResponse> => {
    const customHeaders: Record<string, string> = {};
    if (payload.idempotencyKey) {
      customHeaders['Idempotency-Key'] = payload.idempotencyKey;
    }

    return request<AdminBatchQrResponse>('/api/admin/qr/batch', {
      method: 'POST',
      headers: getAdminHeaders(customHeaders),
      body: JSON.stringify(payload),
    });
  },

  /**
   * Permanently revoke a QR tag
   */
  revokeQrTag: async (tagId: string): Promise<AdminRevokeQrResponse> => {
    return request<AdminRevokeQrResponse>(`/api/admin/qr/tags/${encodeURIComponent(tagId)}/revoke`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
  },

  /**
   * Paginated communication sessions and calls
   */
  getCommunications: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<AdminCommunicationsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = `/api/admin/communications${queryString ? `?${queryString}` : ''}`;
    return request<AdminCommunicationsResponse>(endpoint, {
      headers: getAdminHeaders(),
    });
  },
};
