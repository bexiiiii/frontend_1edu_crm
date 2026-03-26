export type NotificationType = 
  | 'one-time' 
  | 'birthday' 
  | 'payment-reminder' 
  | 'no-subscription';

export type NotificationProvider = 'whatsapp' | 'sms' | 'email';

export type RecipientType = 'all' | 'active-only';

export type PaymentReminderTiming = 
  | 'day-before' 
  | 'same-day' 
  | 'after' 
  | 'week-before';

export interface NotificationHistory {
  id: string;
  type: NotificationType;
  provider: NotificationProvider;
  recipients: number;
  sentAt: string;
  status: 'sent' | 'pending' | 'failed';
  message: string;
}

export interface OneTimeMailingSettings {
  enabled: boolean;
  provider: NotificationProvider;
  template: string;
  sendTime: string;
  recipients: RecipientType;
  skipFirst: number;
  maxSend: number | null;
  attachment?: File | null;
}

export interface BirthdayGreetingSettings {
  enabled: boolean;
  provider: NotificationProvider;
  template: string;
  sendTime: string;
  recipients: RecipientType;
}

export interface PaymentReminderSettings {
  enabled: boolean;
  provider: NotificationProvider;
  template: string;
  timing: PaymentReminderTiming;
  sendTime: string;
  recipients: RecipientType;
}

export interface NoSubscriptionSettings {
  enabled: boolean;
  provider: NotificationProvider;
  template: string;
  sendTime: string;
  daysBeforeClass: number;
  recipients: RecipientType;
}
