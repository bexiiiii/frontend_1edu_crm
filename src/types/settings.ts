export type SettingsTab = 
  | 'user' 
  | 'company' 
  | 'access' 
  | 'roles' 
  | 'rooms' 
  | 'statuses' 
  | 'finance' 
  | 'integrations';

export interface Subscription {
  clientNumber: string;
  validUntil: string | null;
  currentPlan: string;
}

export interface Tariff {
  id: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  features: string[];
  isPopular?: boolean;
}

export interface UserSettings {
  photo: string | null;
  email: string;
  name: string;
  language: string;
}

export interface CompanySettings {
  name: string;
  logo: string | null;
  direction: string;
  city: string;
  manager: string;
  phone: string;
  email: string;
  address: string;
  branches: number;
  currency: string;
  timezone: string;
  language: string;
  workStartTime: string;
  workEndTime: string;
  autoAttendance: boolean;
  autoAttendanceTime: 'morning' | 'evening';
}

export interface UserAccess {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isDeletable: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}
