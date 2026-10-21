import type { ResourceType } from './api';

export type AdminQrTagStatus = 'UNASSIGNED' | 'ASSIGNED' | 'REVOKED';
export type AdminQrTagOrigin = 'PREPRINTED_INVENTORY' | 'GENERATED_FOR_RESOURCE';
export type CommunicationSessionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | string;
export type CommunicationSessionType = 'CALL' | 'ALERT' | 'MESSAGE' | string;

export interface AdminDashboardData {
  users: {
    total: number;
    active: number;
  };
  resources: {
    total: number;
  };
  qrTags: {
    total: number;
    assigned: number;
    available: number;
  };
  communications: {
    totalSessions: number;
  };
  recentActivity: Array<{
    id: string;
    reference: string;
    type: string;
    status: string;
    createdAt: string;
    resourceName: string;
    ownerName: string;
  }>;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  mobileNumber: string;
  active: boolean;
  role?: 'USER' | 'ADMIN';
  createdAt: string;
  resourceCount: number;
  hasContactEndpoint: boolean;
}

export interface AdminUsersResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  users: AdminUserListItem[];
}

export interface AdminUserResource {
  id: string;
  name: string;
  type: ResourceType;
  registrationNum?: string;
  vehicleColour?: string;
  qrTag?: {
    id: string;
    tagNumber: string;
    status: string;
    origin: string;
    assignedAt?: string;
  } | null;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  mobileNumber: string;
  active: boolean;
  role?: 'USER' | 'ADMIN';
  createdAt: string;
  hasContactEndpoint: boolean;
  contactEndpoint?: {
    id: string;
    type: string;
    phoneNumber?: string;
    createdAt?: string;
  } | null;
  resources: AdminUserResource[];
}

export interface AdminQrSummary {
  total: number;
  assigned: number;
  unassigned: number;
  revoked: number;
  byOrigin: Array<{
    origin: AdminQrTagOrigin | string;
    count: number;
  }>;
}

export interface AdminQrTagItem {
  id: string;
  tagNumber: string;
  origin: AdminQrTagOrigin;
  status: AdminQrTagStatus;
  assignmentMethod?: string | null;
  assignedAt?: string | null;
  createdAt: string;
  resource?: {
    id: string;
    name: string;
    type: ResourceType;
    owner?: {
      id: string;
      name: string;
      mobileNumber: string;
    } | null;
  } | null;
}

export interface AdminQrTagsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  tags: AdminQrTagItem[];
}

export interface AdminGenerateSingleQrPayload {
  resourceId?: string;
  origin?: AdminQrTagOrigin;
}

export interface AdminGenerateSingleQrResponse {
  message: string;
  tag: {
    id: string;
    tagNumber: string;
    token?: string;
    qrUrl?: string;
    origin: AdminQrTagOrigin;
    status: AdminQrTagStatus;
    resourceId?: string;
    assignedAt?: string;
  };
  resource?: {
    id: string;
    name: string;
    type?: ResourceType;
    registrationNum?: string;
  } | null;
}

export interface AdminBatchQrPayload {
  quantity: number;
  origin?: AdminQrTagOrigin;
  idempotencyKey?: string;
}

export interface AdminBatchQrItem {
  tagNumber: string;
  token: string;
  qrUrl: string;
}

export interface AdminBatchQrResponse {
  batchId: string;
  count: number;
  origin: AdminQrTagOrigin;
  items: AdminBatchQrItem[];
}

export interface AdminRevokeQrResponse {
  message: string;
  tagId: string;
  tagNumber: string;
  status: 'REVOKED';
}

export interface AdminCommunicationCall {
  id: string;
  callSid?: string;
  caller: string;
  callee: string;
  direction?: string;
  status: string;
  durationSec?: number;
  incomingAt?: string | null;
  connectedAt?: string | null;
  endedAt?: string | null;
}

export interface AdminCommunicationSession {
  id: string;
  reference: string;
  type: CommunicationSessionType;
  status: CommunicationSessionStatus;
  provider?: string;
  createdAt: string;
  expiresAt?: string;
  endedAt?: string | null;
  resource?: {
    id: string;
    name: string;
    type: ResourceType;
    owner?: {
      id: string;
      name: string;
      mobileNumber: string;
    } | null;
  } | null;
  calls: AdminCommunicationCall[];
  callCount: number;
  totalDurationSec: number;
}

export interface AdminCommunicationsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sessions: AdminCommunicationSession[];
}
