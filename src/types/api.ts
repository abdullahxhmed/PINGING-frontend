export interface User {
  id: string;
  name: string;
  mobileNumber: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
  contactEndpoint?: ContactEndpoint | null;
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
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export type CallStatus =
  | 'INITIATED'
  | 'INCOMING'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'MISSED'
  | string;

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

