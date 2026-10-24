export interface User {
  id: string;
  name: string;
  mobileNumber: string;
  active: boolean;
  role?: 'USER' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
  tagNumber?: string | null;
  tag?: string | null;
  tags?: string[];
  qrTag?: any;
}

export interface ContactEndpoint {
  type: 'PHONE' | string;
  phoneNumber: string;
}

export interface UserProfile {
  id: string;
  name: string;
  mobileNumber: string;
  active?: boolean;
  role?: 'USER' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
  contactEndpoint?: ContactEndpoint | null;
  tagNumber?: string | null;
  tag?: string | null;
  tags?: string[];
  qrTag?: any;
}

export interface ContactLink {
  id: string;
  resourceId: string;
  token: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ResourceType = 'VEHICLE' | 'PROPERTY' | 'EQUIPMENT' | 'OTHER';

export interface VehicleDetails {
  registrationNum?: string;
  vehicleColour?: string;
  registrationLast4?: string;
  color?: string;
  colour?: string;
}

export interface CreateResourcePayload {
  name: string;
  type: ResourceType;
  vehicleDetails?: VehicleDetails;
}

export interface UpdateResourcePayload {
  name?: string;
  type?: ResourceType;
  vehicleDetails?: VehicleDetails;
}

export interface Resource {
  id: string;
  userId?: string;
  name: string;
  type?: ResourceType;
  vehicleDetails?: VehicleDetails;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
  contactLinks?: ContactLink[];
  contactUrl?: string;
  publicUrl?: string;
  url?: string;
  token?: string;
  contactLink?: string | ContactLink | { id?: string; token?: string; active?: boolean };
  tagNumber?: string;
  qrTag?: {
    id: string;
    tagNumber: string;
    status?: string;
    origin?: string;
  };
  recentCalls?: CallRecord[];
  calls?: CallRecord[];
  communications?: CallRecord[];
}

export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'IN_PROGRESS'
  | 'INCOMING'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'MISSED'
  | 'FAILED'
  | 'BUSY'
  | 'PENDING'
  | string;

export interface CallRecord {
  id: string;
  sessionId: string;
  caller: string;
  callerLastTwo: string | null;
  status: CallStatus;
  durationSec: number;
  duration: string;
  createdAt: string;
  incomingAt?: string;
  connectedAt?: string | null;
  endedAt?: string | null;
  type: 'CALL' | 'MESSAGE';
}

export interface ResourceCallsResponse {
  resourceId: string;
  resourceName: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  calls: CallRecord[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface PublicResourceContact {
  name: string;
  type?: ResourceType;
  vehicleDetails?: VehicleDetails;
  contactLink?: string | { id: string; active?: boolean };
  id?: string;
  active?: boolean;
  hasRegistrationNumber?: boolean;
}

export interface VerifyRegistrationResponse {
  success: boolean;
  message?: string;
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export type VisitSource = 'qr_scan' | 'share' | 'direct';

export interface TagVisitPayload {
  visitId: string;
  source: VisitSource | string;
}

export interface ResourceAnalyticsSummary {
  totalVisits: number;
  qrScans: number;
  sharedVisits: number;
  directVisits: number;
  callsInitiated: number;
  callsCompleted: number;
  conversionRate: number;
}

export interface ResourceAnalyticsDeviceBreakdown {
  mobile: number;
  desktop: number;
  tablet: number;
}

export interface ResourceAnalyticsHourlyItem {
  hour: number;
  count: number;
}

export interface ResourceAnalyticsRecentVisit {
  id: string;
  createdAt: string;
  deviceType: 'MOBILE' | 'DESKTOP' | 'TABLET' | string;
  source: VisitSource | string;
  os?: string;
  browser?: string;
}

export interface ResourceAnalyticsResponse {
  resourceId: string;
  summary: ResourceAnalyticsSummary;
  deviceBreakdown: ResourceAnalyticsDeviceBreakdown;
  hourlyActivity: ResourceAnalyticsHourlyItem[];
  recentVisits: ResourceAnalyticsRecentVisit[];
}

export interface InitiateCallPayload {
  phoneNumber: string;
  visitId?: string | null;
}

export interface InitiateCallResponse {
  data: {
    sessionId?: string;
    callId: string;
    status: CallStatus;
  };
}

export interface CallStatusData {
  id: string;
  status: CallStatus;
  createdAt?: string;
  incomingAt?: string | null;
  connectedAt?: string | null;
  endedAt?: string | null;
  durationSec?: number | null;
}

export interface CallStatusResponse {
  data: CallStatusData;
}

// QR Code Module Types (/api/qr)
export type QrTagOrigin = 'PREPRINTED_INVENTORY' | 'GENERATED_FOR_RESOURCE';
export type QrTagStatus = 'UNASSIGNED' | 'ASSIGNED' | 'REVOKED';

export interface QrPairedResource {
  id: string;
  name: string;
  type?: ResourceType;
  registrationNum?: string;
  vehicleColour?: string;
  colour?: string;
}

export interface QrTagLookupResponse {
  tagId: string;
  tagNumber: string;
  origin: QrTagOrigin;
  status: QrTagStatus;
  isAssigned: boolean;
  pairedResource: QrPairedResource | null;
}

export interface QrResolveResponse {
  status: 'ASSIGNED' | 'UNASSIGNED' | 'REVOKED' | string;
  action: 'CONTACT' | 'PAIR' | 'REVOKED' | string;
  contactToken?: string;
  claimToken?: string;
  tagNumber?: string;
  redirectUrl?: string;
  message?: string;
  resource?: {
    name: string;
    registrationNum?: string;
    colour?: string;
  };
}

export interface PairQrPayload {
  qrToken?: string;
  tagNumber?: string;
  resourceId: string;
  replaceExistingOnResource?: boolean;
}

export interface PairQrResponse {
  message: string;
  tag: {
    id: string;
    tagNumber: string;
    status: 'ASSIGNED';
    resourceId: string;
    assignedAt: string;
    assignmentMethod?: string;
  };
  resource: {
    id: string;
    name: string;
    type?: ResourceType;
    registrationNum?: string;
  };
}

export interface UnpairQrPayload {
  qrToken?: string;
  tagNumber?: string;
  tagId?: string;
  resourceId?: string;
}

export interface UnpairQrResponse {
  message: string;
  tagId: string;
  tagNumber: string;
  unassignedResourceId: string;
}

export interface GenerateQrPayload {
  resourceId?: string;
  origin?: QrTagOrigin;
}

export interface GenerateQrResponse {
  message: string;
  tag: {
    id: string;
    tagNumber: string;
    token?: string;
    qrUrl?: string;
    origin: QrTagOrigin;
    status: QrTagStatus;
    resourceId?: string | null;
    assignedAt?: string;
  };
  resource: {
    id: string;
    name: string;
    type?: ResourceType;
    registrationNum?: string;
  } | null;
}

export * from './subscription';


