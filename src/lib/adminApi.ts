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
  AdminProduct,
  AdminProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
  AddVariantPayload,
  AdminInventorySummary,
  AdminInventoryTagsResponse,
  AdminBatchGenerateTagsPayload,
  AdminBatchGenerateTagsResponse,
  UpdateTagStatePayload,
  BulkStockItem,
  CreateOrUpdateBulkStockPayload,
  AdminOrder,
  AdminOrdersResponse,
  AdminOrderMetrics,
  AdminOrderStatus,
  PrintProfile,
  PrintTemplate,
  UpsertPrintProfilePayload,
  CreatePrintTemplatePayload,
  PrintBatch,
  PrintBatchesResponse,
  CreatePrintBatchPayload,
  ReceivePrintBatchPayload,
  ReceivePrintBatchResponse,
  InwardPrintBatchPayload,
  InwardPrintBatchResponse,
  PackingStatusData,
  StartPackingSessionResponse,
  ScanPackingTagResponse,
  CancelPackingSessionResponse,
  FinalizePackingResponse,
  AdminStorefrontSlotsResponse,
  StorefrontSlot,
  AdminStorefrontSlotHistoryResponse,
} from '../types/admin';

export const adminStorage = {
  getAdminKey: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pingin_admin_key') || 'pingin_admin_secret_key_2026';
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
   * QR inventory summary counts (legacy endpoint)
   */
  getQrSummary: async (): Promise<AdminQrSummary> => {
    return request<AdminQrSummary>('/api/admin/qr/summary', {
      headers: getAdminHeaders(),
    });
  },

  /**
   * Paginated QR tag inventory list (legacy endpoint)
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
   * Batch-generate preprinted QR sticker inventory (legacy endpoint)
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

  // ==========================================
  // 4. Admin Catalog Management APIs (/api/admin/catalog)
  // ==========================================

  /**
   * GET /api/admin/catalog/products
   * List catalog products with pagination, search, type and active filter
   */
  getCatalogProducts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    activeOnly?: boolean;
  }): Promise<AdminProductsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) query.set('search', params.search.trim());
    if (params?.type && params.type !== 'ALL') query.set('type', params.type);
    if (params?.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));

    const queryString = query.toString();
    const endpoint = `/api/admin/catalog/products${queryString ? `?${queryString}` : ''}`;
    return request<AdminProductsResponse>(endpoint, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * GET /api/admin/catalog/products/:id
   * Fetch complete product details including variants, BOM components, and image references.
   */
  getCatalogProductById: async (id: string): Promise<{ data: AdminProduct }> => {
    return request<{ data: AdminProduct }>(
      `/api/admin/catalog/products/${encodeURIComponent(id)}`,
      {
        headers: getAdminHeaders(),
      }
    );
  },

  /**
   * POST /api/admin/catalog/products
   * Create a product with variants and Bill of Materials components.
   * Strict validation: Physical products must define at least one SERIALIZED_QR_TAG component with inventorySku.
   */
  createCatalogProduct: async (
    payload: CreateProductPayload
  ): Promise<{ message: string; data: AdminProduct }> => {
    return request<{ message: string; data: AdminProduct }>('/api/admin/catalog/products', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * PATCH /api/admin/catalog/products/:id
   * Update product metadata, base price, dimensions, or shipping weight.
   */
  updateCatalogProduct: async (
    id: string,
    payload: UpdateProductPayload
  ): Promise<{ message: string; data: AdminProduct }> => {
    return request<{ message: string; data: AdminProduct }>(
      `/api/admin/catalog/products/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * PATCH /api/admin/catalog/products/:id/active
   * Toggle product visibility in the store.
   */
  toggleProductActive: async (
    id: string,
    active: boolean
  ): Promise<{ message: string; data: { id: string; active: boolean } }> => {
    return request<{ message: string; data: { id: string; active: boolean } }>(
      `/api/admin/catalog/products/${encodeURIComponent(id)}/active`,
      {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ active }),
      }
    );
  },

  /**
   * POST /api/admin/catalog/products/:id/variants
   * Add an additional variant to an existing product with BOM components.
   */
  addProductVariant: async (
    id: string,
    payload: AddVariantPayload
  ): Promise<{ message: string; data: any }> => {
    return request<{ message: string; data: any }>(
      `/api/admin/catalog/products/${encodeURIComponent(id)}/variants`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * PATCH /api/admin/catalog/variants/:variantId
   * Update variant price, name, and BOM components
   */
  updateCatalogVariant: async (
    variantId: string,
    payload: {
      name?: string;
      price?: number;
      active?: boolean;
      imageUrl?: string | null;
      components?: any[];
    }
  ): Promise<{ message: string; data: any }> => {
    return request<{ message: string; data: any }>(
      `/api/admin/catalog/variants/${encodeURIComponent(variantId)}`,
      {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * GET /api/admin/catalog/images
   * List existing catalog images from GCS bucket
   */
  getCatalogImages: async (folder?: string): Promise<{
    total: number;
    data: Array<{
      objectPath: string;
      name: string;
      folder: string;
      size: number;
      contentType: string;
      updatedAt: string;
      url: string;
    }>;
  }> => {
    const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    return request(`/api/admin/catalog/images${query}`, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * POST /api/admin/catalog/images/upload-url
   * Request signed PUT upload URL for direct streaming to GCS
   */
  getCatalogImageUploadUrl: async (payload: {
    folder: string;
    filename: string;
    contentType: string;
  }): Promise<{
    message: string;
    data: {
      uploadUrl: string;
      objectPath: string;
      previewUrl: string;
      expiresAt: string;
    };
  }> => {
    return request('/api/admin/catalog/images/upload-url', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * Upload binary file directly from browser to GCS via pre-signed URL
   */
  uploadCatalogImageDirect: async (
    file: File,
    categoryFolder: string = 'general'
  ): Promise<{ objectPath: string; previewUrl: string }> => {
    const res = await adminApi.getCatalogImageUploadUrl({
      folder: categoryFolder,
      filename: file.name,
      contentType: file.type || 'image/png',
    });

    const { uploadUrl, objectPath, previewUrl } = res.data;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/png',
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload to Google Cloud Storage: ${uploadRes.statusText}`);
    }

    return { objectPath, previewUrl };
  },

  // ==========================================
  // 5. Admin QR Tag Inventory Management APIs (/api/admin/inventory)
  // ==========================================

  /**
   * GET /api/admin/inventory/summary
   * Unified breakdown of serialized tag inventory grouped by SKU and commerce state,
   * plus bulk packaging stock counters and low-stock alerts.
   */
  getInventorySummary: async (): Promise<{ data: AdminInventorySummary }> => {
    return request<{ data: AdminInventorySummary }>('/api/admin/inventory/summary', {
      headers: getAdminHeaders(),
    });
  },

  /**
   * POST /api/admin/inventory/tags/batch
   * Batch-generate physical QR tags directly bound to a product's tag SKU.
   */
  batchGenerateInventoryTags: async (
    payload: AdminBatchGenerateTagsPayload,
    idempotencyKey?: string
  ): Promise<AdminBatchGenerateTagsResponse> => {
    const customHeaders: Record<string, string> = {};
    if (idempotencyKey) {
      customHeaders['Idempotency-Key'] = idempotencyKey;
    }

    return request<AdminBatchGenerateTagsResponse>('/api/admin/inventory/tags/batch', {
      method: 'POST',
      headers: getAdminHeaders(customHeaders),
      body: JSON.stringify(payload),
    });
  },

  /**
   * GET /api/admin/inventory/tags
   * Paginated search across physical serialized tag inventory.
   */
  getInventoryTags: async (params?: {
    page?: number;
    limit?: number;
    sku?: string;
    state?: string;
    search?: string;
  }): Promise<AdminInventoryTagsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sku && params.sku !== 'ALL') query.set('sku', params.sku);
    if (params?.state && params.state !== 'ALL') query.set('state', params.state);
    if (params?.search && params.search.trim()) query.set('search', params.search.trim());

    const queryString = query.toString();
    const endpoint = `/api/admin/inventory/tags${queryString ? `?${queryString}` : ''}`;
    return request<AdminInventoryTagsResponse>(endpoint, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * PATCH /api/admin/inventory/tags/:tagId/state
   * Update a tag's inventory state (e.g., damaged during packaging or returned).
   */
  updateTagStockState: async (
    tagId: string,
    payload: UpdateTagStatePayload
  ): Promise<{ message: string; data: any }> => {
    return request<{ message: string; data: any }>(
      `/api/admin/inventory/tags/${encodeURIComponent(tagId)}/state`,
      {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * GET /api/admin/inventory/bulk-stock
   * View non-serialized physical items (boxes, adhesive pads, keychains).
   */
  getBulkStock: async (): Promise<{ data: BulkStockItem[] }> => {
    return request<{ data: BulkStockItem[] }>('/api/admin/inventory/bulk-stock', {
      headers: getAdminHeaders(),
    });
  },

  /**
   * POST /api/admin/inventory/bulk-stock
   * Create a new bulk item or adjust inventory counters (restock).
   */
  createOrUpdateBulkStock: async (
    payload: CreateOrUpdateBulkStockPayload
  ): Promise<{ message: string; data: BulkStockItem }> => {
    return request<{ message: string; data: BulkStockItem }>('/api/admin/inventory/bulk-stock', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
  },

  // ==========================================
  // 5b. Physical Print Profiles & Vendor Runs
  // ==========================================

  /**
   * GET /api/admin/inventory/print-profiles/:sku
   * Retrieve physical print profile and active design templates for a SKU.
   */
  getPrintProfile: async (sku: string): Promise<{ data: PrintProfile }> => {
    return request<{ data: PrintProfile }>(
      `/api/admin/inventory/print-profiles/${encodeURIComponent(sku)}`,
      {
        headers: getAdminHeaders(),
      }
    );
  },

  /**
   * PUT /api/admin/inventory/print-profiles/:sku
   * Upsert physical print profile (Dimensions, shape, material, finish, bleed, margin).
   * Synchronizes Product.lengthCm and Product.breadthCm for shipping calculations.
   */
  upsertPrintProfile: async (
    sku: string,
    payload: UpsertPrintProfilePayload
  ): Promise<{ message: string; data: PrintProfile }> => {
    return request<{ message: string; data: PrintProfile }>(
      `/api/admin/inventory/print-profiles/${encodeURIComponent(sku)}`,
      {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * POST /api/admin/inventory/print-profiles/:profileId/templates
   * Add a reusable design template to a print profile.
   */
  addPrintTemplate: async (
    profileId: string,
    payload: CreatePrintTemplatePayload
  ): Promise<{ message: string; data: PrintTemplate }> => {
    return request<{ message: string; data: PrintTemplate }>(
      `/api/admin/inventory/print-profiles/${encodeURIComponent(profileId)}/templates`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * GET /api/admin/inventory/print-batches
   * List production print runs / vendor batches.
   */
  getPrintBatches: async (params?: {
    page?: number;
    limit?: number;
    sku?: string;
    status?: string;
  }): Promise<PrintBatchesResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sku && params.sku !== 'ALL') query.set('sku', params.sku);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);

    const qs = query.toString();
    return request<PrintBatchesResponse>(`/api/admin/inventory/print-batches${qs ? `?${qs}` : ''}`, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * POST /api/admin/inventory/print-batches
   * Create a production print run (dispatched to vendor) from unprinted digital tags.
   */
  createPrintBatch: async (
    payload: CreatePrintBatchPayload
  ): Promise<{ message: string; data: PrintBatch }> => {
    return request<{ message: string; data: PrintBatch }>('/api/admin/inventory/print-batches', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * GET /api/admin/inventory/print-batches/:batchId/export?format=csv
   * Export Vendor Print Manifest (CSV or JSON).
   */
  exportPrintBatchManifest: async (batchId: string, format: 'csv' | 'json' = 'csv'): Promise<string> => {
    const endpoint = `/api/admin/inventory/print-batches/${encodeURIComponent(batchId)}/export?format=${format}`;
    const headers = getAdminHeaders();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to export print manifest');
    }
    return response.text();
  },

  /**
   * POST /api/admin/inventory/print-batches/:batchId/receive
   * Warehouse Receiving & Stock Activation (Partial / Complete).
   */
  receivePrintBatch: async (
    batchId: string,
    payload: ReceivePrintBatchPayload
  ): Promise<ReceivePrintBatchResponse> => {
    return request<ReceivePrintBatchResponse>(
      `/api/admin/inventory/print-batches/${encodeURIComponent(batchId)}/receive`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * GET /api/admin/inventory/print-batches/:batchId
   * Fetch complete authoritative batch details including receipts, product/variant snapshot, and sample tags.
   */
  getPrintBatchById: async (batchId: string): Promise<{ data: PrintBatch }> => {
    return request<{ data: PrintBatch }>(
      `/api/admin/inventory/print-batches/${encodeURIComponent(batchId)}`,
      {
        headers: getAdminHeaders(),
      }
    );
  },

  /**
   * POST /api/admin/inventory/print-batches/:batchId/dispatch
   * Record explicit batch dispatch to print vendor (GENERATED -> PRINTING).
   */
  dispatchPrintBatch: async (
    batchId: string,
    payload?: { vendorName?: string }
  ): Promise<{ message: string; data: PrintBatch }> => {
    return request<{ message: string; data: PrintBatch }>(
      `/api/admin/inventory/print-batches/${encodeURIComponent(batchId)}/dispatch`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload || {}),
      }
    );
  },

  /**
   * POST /api/admin/inventory/print-batches/:batchId/inward
   * Idempotent warehouse inwarding supporting counts, deterministic defects, and receipt audit logging.
   */
  inwardPrintBatch: async (
    batchId: string,
    payload: InwardPrintBatchPayload
  ): Promise<InwardPrintBatchResponse> => {
    return request<InwardPrintBatchResponse>(
      `/api/admin/inventory/print-batches/${encodeURIComponent(batchId)}/inward`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  // ==========================================
  // 6. Admin Orders Management APIs (/api/admin/orders)
  // ==========================================

  /**
   * GET /api/admin/orders
   * Paginated list of customer orders with search, status filtering, and date range filters.
   */
  getOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: AdminOrderStatus | string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ status: string; data: AdminOrdersResponse }> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search && params.search.trim()) query.set('search', params.search.trim());
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const queryString = query.toString();
    const endpoint = `/api/admin/orders${queryString ? `?${queryString}` : ''}`;
    return request<{ status: string; data: AdminOrdersResponse }>(endpoint, {
      headers: getAdminHeaders(),
    });
  },

  /**
   * GET /api/admin/orders/metrics
   * Aggregate metrics and financial KPIs for order management overview.
   */
  getOrderMetrics: async (): Promise<{ status: string; data: AdminOrderMetrics }> => {
    return request<{ status: string; data: AdminOrderMetrics }>('/api/admin/orders/metrics', {
      headers: getAdminHeaders(),
    });
  },

  /**
   * GET /api/admin/orders/:orderId
   * Deep inspection of an order including its Bill of Materials and fulfillment snapshot.
   */
  getOrderById: async (orderId: string): Promise<{ status: string; data: AdminOrder }> => {
    return request<{ status: string; data: AdminOrder }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}`,
      {
        headers: getAdminHeaders(),
      }
    );
  },

  /**
   * PATCH /api/admin/orders/:orderId/status
   * Advance or update an order's fulfillment lifecycle state.
   */
  updateOrderStatus: async (
    orderId: string,
    status: AdminOrderStatus
  ): Promise<{ status: string; data: { id: string; orderNumber: string; status: AdminOrderStatus; updatedAt: string } }> => {
    return request<{ status: string; data: { id: string; orderNumber: string; status: AdminOrderStatus; updatedAt: string } }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status }),
      }
    );
  },

  // ==========================================
  // 7. Warehouse Pick-to-Scan Packing APIs (/api/admin/orders/:orderId/packing)
  // ==========================================

  /**
   * GET /api/admin/orders/:orderId/packing
   * Fetches required SKUs, live scan counts, remaining quantities, and scanned tag history.
   */
  getPackingStatus: async (orderId: string): Promise<{ data: PackingStatusData }> => {
    return request<{ data: PackingStatusData }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/packing`,
      {
        headers: getAdminHeaders(),
      }
    );
  },

  /**
   * POST /api/admin/orders/:orderId/packing/start
   * Locks the order and starts an active packing session.
   */
  startPackingSession: async (
    orderId: string,
    packedBy?: string
  ): Promise<StartPackingSessionResponse> => {
    return request<StartPackingSessionResponse>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/packing/start`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ packedBy: packedBy || 'warehouse_operator' }),
      }
    );
  },

  /**
   * POST /api/admin/orders/:orderId/packing/scan
   * Atomically binds a physical tag to the order after validating server-side SKU & stock.
   */
  scanPackingTag: async (
    orderId: string,
    payload: { sessionId: string; scannedCode: string }
  ): Promise<ScanPackingTagResponse> => {
    return request<ScanPackingTagResponse>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/packing/scan`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * POST /api/admin/orders/:orderId/packing/cancel
   * Rolls back all allocations in the session, restores tags to IN_STOCK, reverts order to PAID.
   */
  cancelPackingSession: async (
    orderId: string,
    payload: { sessionId: string; reason?: string }
  ): Promise<CancelPackingSessionResponse> => {
    return request<CancelPackingSessionResponse>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/packing/cancel`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * POST /api/admin/orders/:orderId/packing/finalize
   * Locks the manifest, marks order PACKED, and enqueues shipment dispatch.
   */
  finalizePackingSession: async (
    orderId: string,
    sessionId: string
  ): Promise<FinalizePackingResponse> => {
    return request<FinalizePackingResponse>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/packing/finalize`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ sessionId }),
      }
    );
  },

  // -------------------------------------------------------------
  // Storefront Slot Configurator Endpoints (Phase 5)
  // -------------------------------------------------------------

  /**
   * GET /api/admin/catalog/slots
   * Fetches all storefront slots, mapped products, and available bundle & individual pickers
   */
  getStorefrontSlots: async (): Promise<AdminStorefrontSlotsResponse> => {
    return request<AdminStorefrontSlotsResponse>('/api/admin/catalog/slots', {
      headers: getAdminHeaders(),
    });
  },

  /**
   * PUT /api/admin/catalog/slots/:slotKey
   * Reassign, swap, or clear (productId: null) a storefront slot.
   * Auto-swaps if product is already assigned to another slot.
   */
  updateStorefrontSlot: async (
    slotKey: string,
    payload: {
      productId?: string | null;
      variantId?: string | null;
      reason?: string;
      label?: string;
      displayOrder?: number;
      active?: boolean;
    }
  ): Promise<{ message: string; data: StorefrontSlot }> => {
    return request<{ message: string; data: StorefrontSlot }>(
      `/api/admin/catalog/slots/${encodeURIComponent(slotKey)}`,
      {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * POST /api/admin/catalog/slots
   * Create a new custom dynamic storefront slot
   */
  createStorefrontSlot: async (payload: {
    slotKey: string;
    label: string;
    slotType: 'BUNDLE' | 'INDIVIDUAL';
    displayOrder?: number;
    productId?: string | null;
    variantId?: string | null;
  }): Promise<{ message: string; data: StorefrontSlot }> => {
    return request<{ message: string; data: StorefrontSlot }>('/api/admin/catalog/slots', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * DELETE /api/admin/catalog/slots/:slotKey
   * Delete a custom storefront slot
   */
  deleteStorefrontSlot: async (slotKey: string): Promise<{ message: string }> => {
    return request<{ message: string }>(
      `/api/admin/catalog/slots/${encodeURIComponent(slotKey)}`,
      {
        method: 'DELETE',
        headers: getAdminHeaders(),
      }
    );
  },

  /**
   * GET /api/admin/catalog/slots/history
   * Paginated audit log of all storefront slot changes
   */
  getStorefrontSlotHistory: async (params?: {
    page?: number;
    limit?: number;
    slotKey?: string;
  }): Promise<AdminStorefrontSlotHistoryResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.slotKey) query.set('slotKey', params.slotKey);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return request<AdminStorefrontSlotHistoryResponse>(`/api/admin/catalog/slots/history${qs}`, {
      headers: getAdminHeaders(),
    });
  },
};

