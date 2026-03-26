'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Edit2, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  AddUserModal,
  type UserFormPayload,
} from '@/components/features/settings/AddUserModal';
import { EditRoleModal } from '@/components/features/settings/EditRoleModal';
import type { RoleFormPayload } from '@/components/features/settings/EditRoleModal';
import { AddRoomModal } from '@/components/features/settings/AddRoomModal';
import {
  AddAttendanceStatusModal,
  type AttendanceStatusFormPayload,
} from '@/components/features/settings/AddAttendanceStatusModal';
import {
  AddPaymentSourceModal,
  type PaymentSourceFormPayload,
} from '@/components/features/settings/AddPaymentSourceModal';
import { IntegrationModal } from '@/components/features/settings/IntegrationModal';
import {
  AddStaffStatusModal,
  type StaffStatusFormPayload,
} from '@/components/features/settings/AddStaffStatusModal';
import {
  AddIncomeCategoryModal,
  type IncomeCategoryFormPayload,
} from '@/components/features/settings/AddIncomeCategoryModal';
import {
  AddExpenseCategoryModal,
  type ExpenseCategoryFormPayload,
} from '@/components/features/settings/AddExpenseCategoryModal';
import { ResetUserPasswordModal } from '@/components/features/settings/ResetUserPasswordModal';
import {
  SETTINGS_TABS,
  LANGUAGES,
  CURRENCIES,
  TIMEZONES,
} from '@/constants/settings';
import { INTEGRATIONS } from '@/constants/settings-data';
import {
  changePassword,
  createUser,
  deleteUser,
  filesService,
  getUserById,
  getProfile,
  getUsers,
  resetUserPassword,
  roomsService,
  settingsService,
  tenantsService,
  updateProfile,
  updateUser,
  type CreateRoomRequest,
  type CreateUserRequest,
  type SettingsDto,
  type TenantDto,
  type UpdateTenantRequest,
  type UserDto,
} from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useMutation } from '@/hooks/useApi';
import { pushToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import type { SettingsTab, Role } from '@/types/settings';
import type { Integration } from '@/types/settings-data';
import {
  STAFF_ROLE_LABELS,
} from '@/constants/employee';

const WORKING_DAY_OPTIONS = [
  { value: 'MONDAY', label: 'Пн' },
  { value: 'TUESDAY', label: 'Вт' },
  { value: 'WEDNESDAY', label: 'Ср' },
  { value: 'THURSDAY', label: 'Чт' },
  { value: 'FRIDAY', label: 'Пт' },
  { value: 'SATURDAY', label: 'Сб' },
  { value: 'SUNDAY', label: 'Вс' },
] as const;

type WorkingDayValue = (typeof WORKING_DAY_OPTIONS)[number]['value'];
type SettingsUpdatePayload = Omit<SettingsDto, 'id' | 'createdAt' | 'updatedAt'>;

interface CompanySettingsFormValues {
  centerName: string;
  mainDirection: string;
  directorName: string;
  corporateEmail: string;
  branchCount: string;
  logoUrl: string;
  city: string;
  workPhone: string;
  address: string;
  directorBasis: string;
  bankAccount: string;
  bank: string;
  bin: string;
  bik: string;
  requisites: string;
  timezone: string;
  currency: string;
  language: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  slotDurationMin: string;
  workingDays: WorkingDayValue[];
  defaultLessonDurationMin: string;
  trialLessonDurationMin: string;
  maxGroupSize: string;
  autoMarkAttendance: boolean;
  attendanceWindowDays: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  smsSenderName: string;
  latePaymentReminderDays: string;
  subscriptionExpiryReminderDays: string;
  brandColor: string;
}

interface PersonalProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  language: string;
  photoUrl: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface TenantFormValues {
  name: string;
  email: string;
  phone: string;
  status: string;
  plan: string;
  timezone: string;
  maxStudents: string;
  maxStaff: string;
  trialEndsAt: string;
  contactPerson: string;
  notes: string;
}

interface EditableUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  permissions: string[];
  permissionsLoaded: boolean;
  isDeletable: boolean;
}

type EditableRoom = CreateRoomRequest & { id: string };

const AUTH_USER_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'TENANT_ADMIN', label: 'Администратор тенанта' },
  { value: 'MANAGER', label: STAFF_ROLE_LABELS.MANAGER },
  { value: 'RECEPTIONIST', label: STAFF_ROLE_LABELS.RECEPTIONIST },
  { value: 'TEACHER', label: STAFF_ROLE_LABELS.TEACHER },
  { value: 'ACCOUNTANT', label: STAFF_ROLE_LABELS.ACCOUNTANT },
  { value: 'ADMIN', label: STAFF_ROLE_LABELS.ADMIN },
];

const TENANT_STATUS_OPTIONS = [
  { value: 'TRIAL', label: 'Триал' },
  { value: 'ACTIVE', label: 'Активен' },
  { value: 'INACTIVE', label: 'Неактивен' },
  { value: 'SUSPENDED', label: 'Приостановлен' },
  { value: 'BANNED', label: 'Заблокирован' },
];

const TENANT_PLAN_OPTIONS = [
  { value: 'BASIC', label: 'Базовый' },
  { value: 'PROFESSIONAL', label: 'Профессиональный' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallbackMessage;
}

function normalizeTimeValue(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return value.slice(0, 5);
}

function normalizeDateValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function parseWorkingDays(value: string | null | undefined): WorkingDayValue[] {
  if (!value?.trim()) {
    return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  }

  const normalized = value.trim();

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter((item): item is WorkingDayValue =>
          WORKING_DAY_OPTIONS.some((option) => option.value === item)
        );
    }
  } catch {
    // Fallback to comma-separated values.
  }

  return normalized
    .split(',')
    .map((item) => item.replace(/[[\]"]/g, '').trim())
    .filter((item): item is WorkingDayValue =>
      WORKING_DAY_OPTIONS.some((option) => option.value === item)
    );
}

function buildCompanySettingsForm(settings?: SettingsDto | null): CompanySettingsFormValues {
  return {
    centerName: settings?.centerName ?? '',
    mainDirection: settings?.mainDirection ?? '',
    directorName: settings?.directorName ?? '',
    corporateEmail: settings?.corporateEmail ?? '',
    branchCount: settings?.branchCount == null ? '1' : String(settings.branchCount),
    logoUrl: settings?.logoUrl ?? '',
    city: settings?.city ?? '',
    workPhone: settings?.workPhone ?? '',
    address: settings?.address ?? '',
    directorBasis: settings?.directorBasis ?? '',
    bankAccount: settings?.bankAccount ?? '',
    bank: settings?.bank ?? '',
    bin: settings?.bin ?? '',
    bik: settings?.bik ?? '',
    requisites: settings?.requisites ?? '',
    timezone: settings?.timezone || 'Asia/Almaty',
    currency: settings?.currency || 'KZT',
    language: settings?.language || 'ru',
    workingHoursStart: normalizeTimeValue(settings?.workingHoursStart, '08:00'),
    workingHoursEnd: normalizeTimeValue(settings?.workingHoursEnd, '23:00'),
    slotDurationMin: String(settings?.slotDurationMin ?? 30),
    workingDays: parseWorkingDays(settings?.workingDays),
    defaultLessonDurationMin: String(settings?.defaultLessonDurationMin ?? 90),
    trialLessonDurationMin: String(settings?.trialLessonDurationMin ?? 60),
    maxGroupSize: String(settings?.maxGroupSize ?? 10),
    autoMarkAttendance: settings?.autoMarkAttendance ?? false,
    attendanceWindowDays: String(settings?.attendanceWindowDays ?? 1),
    smsEnabled: settings?.smsEnabled ?? false,
    emailEnabled: settings?.emailEnabled ?? true,
    smsSenderName: settings?.smsSenderName ?? '',
    latePaymentReminderDays: String(settings?.latePaymentReminderDays ?? 3),
    subscriptionExpiryReminderDays: String(settings?.subscriptionExpiryReminderDays ?? 7),
    brandColor: settings?.brandColor || '#25c4b8',
  };
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toRequiredNumber(value: string, fallback: number): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function mapCompanyFormToPayload(form: CompanySettingsFormValues): SettingsUpdatePayload {
  return {
    centerName: toNullableString(form.centerName),
    mainDirection: toNullableString(form.mainDirection),
    directorName: toNullableString(form.directorName),
    corporateEmail: toNullableString(form.corporateEmail),
    branchCount: toOptionalNumber(form.branchCount),
    logoUrl: toNullableString(form.logoUrl),
    city: toNullableString(form.city),
    workPhone: toNullableString(form.workPhone),
    address: toNullableString(form.address),
    directorBasis: toNullableString(form.directorBasis),
    bankAccount: toNullableString(form.bankAccount),
    bank: toNullableString(form.bank),
    bin: toNullableString(form.bin),
    bik: toNullableString(form.bik),
    requisites: toNullableString(form.requisites),
    timezone: form.timezone || 'Asia/Almaty',
    currency: form.currency || 'KZT',
    language: form.language || 'ru',
    workingHoursStart: `${form.workingHoursStart || '08:00'}:00`,
    workingHoursEnd: `${form.workingHoursEnd || '23:00'}:00`,
    slotDurationMin: toRequiredNumber(form.slotDurationMin, 30),
    workingDays: JSON.stringify(form.workingDays),
    defaultLessonDurationMin: toRequiredNumber(form.defaultLessonDurationMin, 90),
    trialLessonDurationMin: toRequiredNumber(form.trialLessonDurationMin, 60),
    maxGroupSize: toRequiredNumber(form.maxGroupSize, 10),
    autoMarkAttendance: form.autoMarkAttendance,
    attendanceWindowDays: toRequiredNumber(form.attendanceWindowDays, 1),
    smsEnabled: form.smsEnabled,
    emailEnabled: form.emailEnabled,
    smsSenderName: toNullableString(form.smsSenderName),
    latePaymentReminderDays: toRequiredNumber(form.latePaymentReminderDays, 3),
    subscriptionExpiryReminderDays: toRequiredNumber(form.subscriptionExpiryReminderDays, 7),
    brandColor: form.brandColor || '#25c4b8',
  };
}

function buildPersonalProfileForm(profile?: UserDto | null): PersonalProfileFormValues {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    email: profile?.email ?? '',
    language: profile?.language || 'ru',
    photoUrl: profile?.photoUrl ?? '',
  };
}

function buildTenantForm(tenant?: TenantDto | null): TenantFormValues {
  return {
    name: tenant?.name ?? '',
    email: tenant?.email ?? '',
    phone: tenant?.phone ?? '',
    status: tenant?.status || 'ACTIVE',
    plan: tenant?.plan || 'BASIC',
    timezone: tenant?.timezone || 'Asia/Almaty',
    maxStudents: tenant?.maxStudents == null ? '' : String(tenant.maxStudents),
    maxStaff: tenant?.maxStaff == null ? '' : String(tenant.maxStaff),
    trialEndsAt: normalizeDateValue(tenant?.trialEndsAt),
    contactPerson: tenant?.contactPerson ?? '',
    notes: tenant?.notes ?? '',
  };
}

function formatIsoDate(value: string | null | undefined): string {
  if (!value) {
    return 'Не указано';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getVisibleRoles(roles: string[]): string[] {
  return roles.filter(
    (role) => !['offline_access', 'uma_authorization', 'default-roles-ondeedu'].includes(role)
  );
}

function getPrimaryRole(roles: string[]): string | null {
  return getVisibleRoles(roles)[0] || null;
}

function getDisplayRole(roles: string[]): string {
  const primaryRole = getPrimaryRole(roles);
  if (!primaryRole) {
    return '—';
  }

  if (primaryRole === 'TENANT_ADMIN') {
    return 'Администратор тенанта';
  }

  return STAFF_ROLE_LABELS[primaryRole as keyof typeof STAFF_ROLE_LABELS] || primaryRole;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('user');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EditableUser | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isResetUserPasswordModalOpen, setIsResetUserPasswordModalOpen] = useState(false);
  const [selectedPasswordUser, setSelectedPasswordUser] = useState<EditableUser | null>(null);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [roleModalKey, setRoleModalKey] = useState(0);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isAddAttendanceStatusModalOpen, setIsAddAttendanceStatusModalOpen] = useState(false);
  const [isAddPaymentSourceModalOpen, setIsAddPaymentSourceModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<EditableRoom | null>(null);
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState<AttendanceStatusFormPayload | null>(null);
  const [selectedPaymentSource, setSelectedPaymentSource] = useState<PaymentSourceFormPayload | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isAddStaffStatusModalOpen, setIsAddStaffStatusModalOpen] = useState(false);
  const [selectedStaffStatus, setSelectedStaffStatus] = useState<StaffStatusFormPayload | null>(null);
  const [isAddIncomeCategoryModalOpen, setIsAddIncomeCategoryModalOpen] = useState(false);
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState<IncomeCategoryFormPayload | null>(null);
  const [isAddExpenseCategoryModalOpen, setIsAddExpenseCategoryModalOpen] = useState(false);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<ExpenseCategoryFormPayload | null>(null);
  const [companyFormDraft, setCompanyFormDraft] = useState<CompanySettingsFormValues | null>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);
  const [tenantFormDraft, setTenantFormDraft] = useState<TenantFormValues | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [tenantSuccess, setTenantSuccess] = useState<string | null>(null);
  const [profileFormDraft, setProfileFormDraft] = useState<PersonalProfileFormValues | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormValues>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const tenantId = useAuthStore((state) => state.tenantId);
  const refreshAuthProfile = useAuthStore((state) => state.fetchProfile);

  // ─── API Data ─────────────────────────────────────────────────
  const { data: companySettingsData, loading: companySettingsLoading, error: companySettingsLoadError, refetch: refetchCompanySettings } = useApi(() => settingsService.get(), []);
  const { data: personalProfileData, loading: personalProfileLoading, error: personalProfileLoadError, refetch: refetchPersonalProfile } = useApi(() => getProfile(), []);
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useApi(
    () => (tenantId ? getUsers({ page: 0, size: 200 }) : Promise.resolve({ data: [] as UserDto[] })),
    [tenantId]
  );
  const { data: rolesData, loading: rolesLoading, error: rolesError, refetch: refetchRoles } = useApi(() => settingsService.getRoles(), []);
  const { data: permissionsData, loading: permissionsLoading, error: permissionsError } = useApi(() => settingsService.getPermissions(), []);
  const {
    data: tenantData,
    loading: tenantLoading,
    error: tenantLoadError,
    refetch: refetchTenant,
  } = useApi<TenantDto | null>(
    () => (tenantId ? tenantsService.getById(tenantId) : Promise.resolve({ data: null as TenantDto | null })),
    [tenantId]
  );
  const {
    data: roomsData,
    loading: roomsLoading,
    error: roomsError,
    refetch: refetchRooms,
  } = useApi(() => roomsService.getAll({ page: 0, size: 200 }), []);
  const {
    data: attendanceStatusesData,
    loading: attendanceStatusesLoading,
    error: attendanceStatusesError,
    refetch: refetchAttStatuses,
  } = useApi(() => settingsService.getAttendanceStatuses(), []);
  const {
    data: paymentSourcesData,
    loading: paymentSourcesLoading,
    error: paymentSourcesError,
    refetch: refetchPaySources,
  } = useApi(() => settingsService.getPaymentSources(), []);
  const {
    data: staffStatusesData,
    loading: staffStatusesLoading,
    error: staffStatusesError,
    refetch: refetchStaffStatuses,
  } = useApi(() => settingsService.getStaffStatuses(), []);
  const {
    data: incomeCategoriesData,
    loading: incomeCategoriesLoading,
    error: incomeCategoriesError,
    refetch: refetchIncomeCategories,
  } = useApi(() => settingsService.getIncomeCategories(), []);
  const {
    data: expenseCategoriesData,
    loading: expenseCategoriesLoading,
    error: expenseCategoriesError,
    refetch: refetchExpenseCategories,
  } = useApi(() => settingsService.getExpenseCategories(), []);

  // Map API users → access tab
  const users = useMemo(() => {
    const userList = usersData || [];
    return userList.map((user) => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username,
      email: user.email || '',
      role: getPrimaryRole(user.roles) || 'TEACHER',
      displayRole: getDisplayRole(user.roles),
      permissions: user.permissions || [],
      permissionsLoaded: Array.isArray(user.permissions),
      isDeletable: !user.roles.includes('TENANT_ADMIN'),
    }));
  }, [usersData]);

  const availablePermissions = useMemo(() => permissionsData || [], [permissionsData]);

  // Map API roles → local role type
  const roles = useMemo(() => {
    const rolesList = rolesData || [];
    return rolesList.map((r: { id: string; name: string; description?: string | null; permissions?: string[] }) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: r.permissions || [],
    }));
  }, [rolesData]);

  // Map API rooms → local Room type
  const rooms = useMemo(() => {
    const roomsList = roomsData?.content || [];
    return roomsList.map((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity ?? undefined,
      description: room.description ?? undefined,
      color: room.color ?? undefined,
    }));
  }, [roomsData]);

  // Map API attendance statuses
  const attendanceStatuses = useMemo(() => {
    const list = attendanceStatusesData || [];
    return list.map((s: {
      id: string;
      name: string;
      deductLesson?: boolean;
      requirePayment?: boolean;
      countAsAttended?: boolean;
      color?: string;
      sortOrder?: number;
      systemStatus?: boolean;
    }) => ({
      id: s.id,
      name: s.name,
      deduct: s.deductLesson ?? false,
      pay: s.requirePayment ?? false,
      markAttendance: s.countAsAttended ?? false,
      color: s.color || '#ccc',
      sortOrder: s.sortOrder ?? 0,
      systemStatus: s.systemStatus ?? false,
    }));
  }, [attendanceStatusesData]);

  const staffStatuses = useMemo(() => {
    const list = staffStatusesData || [];
    return list.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      sortOrder: s.sortOrder,
    }));
  }, [staffStatusesData]);

  // Map API payment sources
  const paymentSources = useMemo(() => {
    const list = paymentSourcesData || [];
    return list.map((s: { id: string; name: string; sortOrder?: number; active?: boolean }) => ({
      id: s.id,
      name: s.name,
      sortOrder: s.sortOrder ?? 0,
      active: s.active ?? true,
    }));
  }, [paymentSourcesData]);

  const incomeCategories = useMemo(() => {
    return (incomeCategoriesData || []).map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      active: c.active,
    }));
  }, [incomeCategoriesData]);

  const expenseCategories = useMemo(() => {
    return (expenseCategoriesData || []).map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      active: c.active,
    }));
  }, [expenseCategoriesData]);
  const tenantBaseForm = useMemo(() => buildTenantForm(tenantData), [tenantData]);
  const tenantForm = tenantFormDraft ?? tenantBaseForm;
  const companyBaseForm = useMemo(() => buildCompanySettingsForm(companySettingsData), [companySettingsData]);
  const companyForm = companyFormDraft ?? companyBaseForm;
  const personalProfileBaseForm = useMemo(() => buildPersonalProfileForm(personalProfileData), [personalProfileData]);
  const personalProfileForm = profileFormDraft ?? personalProfileBaseForm;

  // Mutations
  const updateTenantMutation = useMutation((payload: { id: string; data: UpdateTenantRequest }) =>
    tenantsService.update(payload.id, payload.data)
  );
  const createUserMutation = useMutation((data: CreateUserRequest) => createUser(data));
  const updateUserMutation = useMutation((payload: { id: string; data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    permissions?: string[];
  } }) => updateUser(payload.id, payload.data));
  const deleteUserMutation = useMutation((id: string) => deleteUser(id));
  const resetUserPasswordMutation = useMutation((payload: { id: string; newPassword: string }) =>
    resetUserPassword(payload.id, payload.newPassword)
  );
  const updateCompanyMutation = useMutation((data: SettingsUpdatePayload) => settingsService.update(data));
  const uploadCompanyLogoMutation = useMutation((file: File) => settingsService.uploadLogo(file));
  const uploadProfilePhotoMutation = useMutation((payload: { file: File; folder?: string }) =>
    filesService.upload(payload.file, payload.folder)
  );
  const updatePersonalProfileMutation = useMutation((data: { firstName?: string; lastName?: string; photoUrl?: string; language?: string }) =>
    updateProfile(data)
  );
  const changeOwnPasswordMutation = useMutation((data: PasswordFormValues) => changePassword(data));
  const createRoleMutation = useMutation((data: Omit<RoleFormPayload, 'id'>) =>
    settingsService.createRole(data)
  );
  const updateRoleMutation = useMutation((data: RoleFormPayload) =>
    settingsService.updateRole(data.id!, {
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    })
  );
  const deleteRoleMutation = useMutation((id: string) => settingsService.deleteRole(id));
  const createRoomMutation = useMutation((data: CreateRoomRequest) => roomsService.create(data));
  const updateRoomMutation = useMutation((payload: { id: string; data: Partial<CreateRoomRequest> }) =>
    roomsService.update(payload.id, payload.data)
  );
  const deleteRoomMutation = useMutation((id: string) => roomsService.delete(id));
  const createAttendanceStatusMutation = useMutation((data: Omit<AttendanceStatusFormPayload, 'id' | 'systemStatus'>) =>
    settingsService.createAttendanceStatus(data)
  );
  const updateAttendanceStatusMutation = useMutation((data: AttendanceStatusFormPayload) =>
    settingsService.updateAttendanceStatus(data.id!, {
      name: data.name,
      deductLesson: data.deductLesson,
      requirePayment: data.requirePayment,
      countAsAttended: data.countAsAttended,
      color: data.color,
      sortOrder: data.sortOrder,
    })
  );
  const deleteAttendanceStatusMutation = useMutation((id: string) => settingsService.deleteAttendanceStatus(id));
  const createPaymentSourceMutation = useMutation((data: Omit<PaymentSourceFormPayload, 'id'>) =>
    settingsService.createPaymentSource(data)
  );
  const updatePaymentSourceMutation = useMutation((data: PaymentSourceFormPayload) =>
    settingsService.updatePaymentSource(data.id!, {
      name: data.name,
      sortOrder: data.sortOrder,
      active: data.active,
    })
  );
  const deletePaymentSourceMutation = useMutation((id: string) => settingsService.deletePaymentSource(id));
  const createStaffStatusMutation = useMutation((data: Omit<StaffStatusFormPayload, 'id'>) =>
    settingsService.createStaffStatus(data)
  );
  const updateStaffStatusMutation = useMutation((data: StaffStatusFormPayload) =>
    settingsService.updateStaffStatus(data.id!, { name: data.name, color: data.color, sortOrder: data.sortOrder })
  );
  const deleteStaffStatusMutation = useMutation((id: string) => settingsService.deleteStaffStatus(id));
  const createIncomeCategoryMutation = useMutation((data: Omit<IncomeCategoryFormPayload, 'id'>) =>
    settingsService.createIncomeCategory(data)
  );
  const updateIncomeCategoryMutation = useMutation((data: IncomeCategoryFormPayload) =>
    settingsService.updateIncomeCategory(data.id!, { name: data.name, sortOrder: data.sortOrder, active: data.active })
  );
  const deleteIncomeCategoryMutation = useMutation((id: string) => settingsService.deleteIncomeCategory(id));
  const createExpenseCategoryMutation = useMutation((data: Omit<ExpenseCategoryFormPayload, 'id'>) =>
    settingsService.createExpenseCategory(data)
  );
  const updateExpenseCategoryMutation = useMutation((data: ExpenseCategoryFormPayload) =>
    settingsService.updateExpenseCategory(data.id!, { name: data.name, sortOrder: data.sortOrder, active: data.active })
  );
  const deleteExpenseCategoryMutation = useMutation((id: string) => settingsService.deleteExpenseCategory(id));

  const clearTenantMessages = useCallback(() => {
    setTenantError(null);
    setTenantSuccess(null);
  }, []);

  const updateTenantForm = useCallback((patch: Partial<TenantFormValues>) => {
    clearTenantMessages();
    setTenantFormDraft((prev) => ({
      ...(prev ?? tenantBaseForm),
      ...patch,
    }));
  }, [clearTenantMessages, tenantBaseForm]);

  const handleSaveTenant = useCallback(async () => {
    const currentTenantId = tenantData?.id || tenantId;
    if (!currentTenantId) {
      setTenantError('Tenant context не найден. Перезайдите в систему и попробуйте ещё раз.');
      return;
    }

    clearTenantMessages();

    try {
      await updateTenantMutation.mutate({
        id: currentTenantId,
        data: {
          name: toNullableString(tenantForm.name),
          email: toNullableString(tenantForm.email),
          phone: toNullableString(tenantForm.phone),
          status: tenantForm.status,
          plan: tenantForm.plan,
          timezone: tenantForm.timezone || 'Asia/Almaty',
          maxStudents: toOptionalNumber(tenantForm.maxStudents),
          maxStaff: toOptionalNumber(tenantForm.maxStaff),
          trialEndsAt: tenantForm.trialEndsAt.trim() ? tenantForm.trialEndsAt.trim() : null,
          contactPerson: toNullableString(tenantForm.contactPerson),
          notes: toNullableString(tenantForm.notes),
        },
      });
      await refetchTenant();
      setTenantFormDraft(null);
      setTenantSuccess('Настройки тенанта обновлены.');
    } catch (error) {
      setTenantError(getErrorMessage(error, 'Не удалось обновить настройки тенанта.'));
    }
  }, [clearTenantMessages, refetchTenant, tenantData?.id, tenantForm, tenantId, updateTenantMutation]);

  const handleCreateUser = useCallback(() => {
    setSelectedUser(null);
    setIsAddUserModalOpen(true);
  }, []);

  const handleEditUser = useCallback(async (user: EditableUser) => {
    setEditingUserId(user.id);

    try {
      const response = await getUserById(user.id);
      const freshUser = response.data;
      const freshRoles = freshUser.roles || [user.role];

      setSelectedUser({
        id: freshUser.id,
        username: freshUser.username || user.username,
        firstName: freshUser.firstName || user.firstName,
        lastName: freshUser.lastName || user.lastName,
        name: [freshUser.firstName, freshUser.lastName].filter(Boolean).join(' ').trim() || freshUser.username || user.name,
        email: freshUser.email || user.email,
        role: getPrimaryRole(freshRoles) || user.role,
        displayRole: getDisplayRole(freshRoles),
        permissions: freshUser.permissions || user.permissions,
        permissionsLoaded: Array.isArray(freshUser.permissions),
        isDeletable: !freshRoles.includes('TENANT_ADMIN'),
      });
    } catch (error) {
      pushToast({
        message: `Не удалось догрузить полную карточку пользователя: ${getErrorMessage(error, 'Используем данные из списка.')}`,
        tone: 'info',
      });
      setSelectedUser(user);
    } finally {
      setEditingUserId(null);
      setIsAddUserModalOpen(true);
    }
  }, []);

  const handleSaveUser = useCallback(async (data: UserFormPayload) => {
    if (selectedUser?.id) {
      await updateUserMutation.mutate({
        id: selectedUser.id,
        data: {
          email: data.email.trim(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          role: data.role,
          ...(data.permissions ? { permissions: data.permissions } : {}),
        },
      });
      pushToast({ message: 'Пользователь обновлён.', tone: 'success' });
    } else {
      if (!tenantId) {
        throw new Error('Tenant context is not set. Перезайдите в систему и попробуйте ещё раз.');
      }

      if (!data.password?.trim()) {
        throw new Error('Пароль обязателен при создании пользователя.');
      }

      await createUserMutation.mutate({
        username: data.username.trim() || data.email.trim(),
        email: data.email.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        password: data.password.trim(),
        role: data.role,
        tenantId,
        permissions: data.permissions,
      });
      pushToast({ message: 'Пользователь создан.', tone: 'success' });
    }

    await refetchUsers();
    setIsAddUserModalOpen(false);
    setSelectedUser(null);
  }, [createUserMutation, refetchUsers, selectedUser, tenantId, updateUserMutation]);

  const handleDeleteUser = useCallback(async (id: string) => {
    if (!confirm('Деактивировать пользователя?')) return;
    await deleteUserMutation.mutate(id);
    await refetchUsers();
  }, [deleteUserMutation, refetchUsers]);

  const handleOpenResetUserPassword = useCallback((user: EditableUser) => {
    setSelectedPasswordUser(user);
    setIsResetUserPasswordModalOpen(true);
  }, []);

  const handleResetUserPassword = useCallback(async (newPassword: string) => {
    if (!selectedPasswordUser) {
      throw new Error('Пользователь для сброса пароля не выбран.');
    }

    await resetUserPasswordMutation.mutate({
      id: selectedPasswordUser.id,
      newPassword,
    });
    pushToast({ message: 'Пароль пользователя обновлён.', tone: 'success' });
    setIsResetUserPasswordModalOpen(false);
    setSelectedPasswordUser(null);
  }, [resetUserPasswordMutation, selectedPasswordUser]);

  const handleSaveRole = useCallback(async (role: RoleFormPayload) => {
    if (role.id) {
      await updateRoleMutation.mutate(role);
    } else {
      await createRoleMutation.mutate({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      });
    }

    await refetchRoles();
    setIsEditRoleModalOpen(false);
    setSelectedRole(null);
  }, [createRoleMutation, refetchRoles, updateRoleMutation]);

  const handleDeleteRole = useCallback(async (id: string) => {
    if (!confirm('Удалить конфигурацию роли?')) return;
    await deleteRoleMutation.mutate(id);
    await refetchRoles();
  }, [deleteRoleMutation, refetchRoles]);

  const handleCreateAttendanceStatus = useCallback(() => {
    setSelectedAttendanceStatus(null);
    setIsAddAttendanceStatusModalOpen(true);
  }, []);

  const handleCreatePaymentSource = useCallback(() => {
    setSelectedPaymentSource(null);
    setIsAddPaymentSourceModalOpen(true);
  }, []);

  const handleEditRoom = useCallback((room: EditableRoom) => {
    setSelectedRoom(room);
    setIsAddRoomModalOpen(true);
  }, []);

  const handleSaveRoom = useCallback(async (data: CreateRoomRequest) => {
    if (selectedRoom?.id) {
      await updateRoomMutation.mutate({ id: selectedRoom.id, data });
      pushToast({ message: 'Помещение обновлено.', tone: 'success' });
    } else {
      await createRoomMutation.mutate(data);
      pushToast({ message: 'Помещение создано.', tone: 'success' });
    }

    await refetchRooms();
    setIsAddRoomModalOpen(false);
    setSelectedRoom(null);
  }, [createRoomMutation, refetchRooms, selectedRoom, updateRoomMutation]);

  const handleDeleteRoom = useCallback(async (id: string) => {
    if (!confirm('Удалить помещение?')) return;
    await deleteRoomMutation.mutate(id);
    await refetchRooms();
    pushToast({ message: 'Помещение удалено.', tone: 'success' });
  }, [deleteRoomMutation, refetchRooms]);

  const handleSaveAttendanceStatus = useCallback(async (status: AttendanceStatusFormPayload) => {
    if (status.id) {
      await updateAttendanceStatusMutation.mutate(status);
      pushToast({ message: 'Статус посещения обновлён.', tone: 'success' });
    } else {
      await createAttendanceStatusMutation.mutate({
        name: status.name,
        deductLesson: status.deductLesson,
        requirePayment: status.requirePayment,
        countAsAttended: status.countAsAttended,
        color: status.color,
        sortOrder: status.sortOrder,
      });
      pushToast({ message: 'Статус посещения создан.', tone: 'success' });
    }

    await refetchAttStatuses();
    setIsAddAttendanceStatusModalOpen(false);
    setSelectedAttendanceStatus(null);
  }, [createAttendanceStatusMutation, refetchAttStatuses, updateAttendanceStatusMutation]);

  const handleDeleteAttendanceStatus = useCallback(async (id: string, systemStatus: boolean) => {
    if (systemStatus) {
      pushToast({
        message: 'Системный статус нельзя удалить через backend.',
        tone: 'info',
      });
      return;
    }

    if (!confirm('Удалить статус посещения?')) return;

    await deleteAttendanceStatusMutation.mutate(id);
    await refetchAttStatuses();
    pushToast({ message: 'Статус посещения удалён.', tone: 'success' });
  }, [deleteAttendanceStatusMutation, refetchAttStatuses]);

  const handleSavePaymentSource = useCallback(async (source: PaymentSourceFormPayload) => {
    if (source.id) {
      await updatePaymentSourceMutation.mutate(source);
      pushToast({ message: 'Источник платежа обновлён.', tone: 'success' });
    } else {
      await createPaymentSourceMutation.mutate({
        name: source.name,
        sortOrder: source.sortOrder,
        active: source.active,
      });
      pushToast({ message: 'Источник платежа создан.', tone: 'success' });
    }

    await refetchPaySources();
    setIsAddPaymentSourceModalOpen(false);
    setSelectedPaymentSource(null);
  }, [createPaymentSourceMutation, refetchPaySources, updatePaymentSourceMutation]);

  const handleDeletePaymentSource = useCallback(async (id: string) => {
    if (!confirm('Удалить источник платежа?')) return;

    await deletePaymentSourceMutation.mutate(id);
    await refetchPaySources();
    pushToast({ message: 'Источник платежа удалён.', tone: 'success' });
  }, [deletePaymentSourceMutation, refetchPaySources]);

  const handleSaveStaffStatus = useCallback(async (status: StaffStatusFormPayload) => {
    if (status.id) {
      await updateStaffStatusMutation.mutate(status);
      pushToast({ message: 'Статус сотрудника обновлён.', tone: 'success' });
    } else {
      await createStaffStatusMutation.mutate({ name: status.name, color: status.color, sortOrder: status.sortOrder });
      pushToast({ message: 'Статус сотрудника создан.', tone: 'success' });
    }
    await refetchStaffStatuses();
    setIsAddStaffStatusModalOpen(false);
    setSelectedStaffStatus(null);
  }, [createStaffStatusMutation, updateStaffStatusMutation, refetchStaffStatuses]);

  const handleDeleteStaffStatus = useCallback(async (id: string) => {
    if (!confirm('Удалить статус сотрудника?')) return;
    await deleteStaffStatusMutation.mutate(id);
    await refetchStaffStatuses();
    pushToast({ message: 'Статус сотрудника удалён.', tone: 'success' });
  }, [deleteStaffStatusMutation, refetchStaffStatuses]);

  const handleSaveIncomeCategory = useCallback(async (category: IncomeCategoryFormPayload) => {
    if (category.id) {
      await updateIncomeCategoryMutation.mutate(category);
      pushToast({ message: 'Статья дохода обновлена.', tone: 'success' });
    } else {
      await createIncomeCategoryMutation.mutate({ name: category.name, sortOrder: category.sortOrder, active: category.active });
      pushToast({ message: 'Статья дохода создана.', tone: 'success' });
    }
    await refetchIncomeCategories();
    setIsAddIncomeCategoryModalOpen(false);
    setSelectedIncomeCategory(null);
  }, [createIncomeCategoryMutation, updateIncomeCategoryMutation, refetchIncomeCategories]);

  const handleDeleteIncomeCategory = useCallback(async (id: string) => {
    if (!confirm('Удалить статью дохода?')) return;
    await deleteIncomeCategoryMutation.mutate(id);
    await refetchIncomeCategories();
    pushToast({ message: 'Статья дохода удалена.', tone: 'success' });
  }, [deleteIncomeCategoryMutation, refetchIncomeCategories]);

  const handleSaveExpenseCategory = useCallback(async (category: ExpenseCategoryFormPayload) => {
    if (category.id) {
      await updateExpenseCategoryMutation.mutate(category);
      pushToast({ message: 'Статья расхода обновлена.', tone: 'success' });
    } else {
      await createExpenseCategoryMutation.mutate({ name: category.name, sortOrder: category.sortOrder, active: category.active });
      pushToast({ message: 'Статья расхода создана.', tone: 'success' });
    }
    await refetchExpenseCategories();
    setIsAddExpenseCategoryModalOpen(false);
    setSelectedExpenseCategory(null);
  }, [createExpenseCategoryMutation, updateExpenseCategoryMutation, refetchExpenseCategories]);

  const handleDeleteExpenseCategory = useCallback(async (id: string) => {
    if (!confirm('Удалить статью расхода?')) return;
    await deleteExpenseCategoryMutation.mutate(id);
    await refetchExpenseCategories();
    pushToast({ message: 'Статья расхода удалена.', tone: 'success' });
  }, [deleteExpenseCategoryMutation, refetchExpenseCategories]);

  const clearProfileMessages = useCallback(() => {
    setProfileError(null);
    setProfileSuccess(null);
  }, []);

  const updatePersonalProfileForm = useCallback((patch: Partial<PersonalProfileFormValues>) => {
    clearProfileMessages();
    setProfileFormDraft((prev) => ({ ...(prev ?? personalProfileBaseForm), ...patch }));
  }, [clearProfileMessages, personalProfileBaseForm]);

  const handleSavePersonalProfile = useCallback(async () => {
    clearProfileMessages();

    if (!personalProfileForm.firstName.trim() || !personalProfileForm.lastName.trim()) {
      setProfileError('Имя и фамилия обязательны.');
      return;
    }

    try {
      let nextPhotoUrl = personalProfileForm.photoUrl;

      if (profilePhotoFile) {
        const uploadResult = await uploadProfilePhotoMutation.mutate({
          file: profilePhotoFile,
          folder: 'avatars',
        });
        nextPhotoUrl = uploadResult.url;
      }

      await updatePersonalProfileMutation.mutate({
        firstName: personalProfileForm.firstName.trim(),
        lastName: personalProfileForm.lastName.trim(),
        language: personalProfileForm.language,
        photoUrl: nextPhotoUrl || undefined,
      });

      await Promise.all([refetchPersonalProfile(), refreshAuthProfile()]);
      setProfileFormDraft(null);
      setProfilePhotoFile(null);
      setProfileSuccess('Личные данные сохранены.');
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Не удалось сохранить личные данные.'));
    }
  }, [
    clearProfileMessages,
    personalProfileForm,
    profilePhotoFile,
    refetchPersonalProfile,
    refreshAuthProfile,
    updatePersonalProfileMutation,
    uploadProfilePhotoMutation,
  ]);

  const handlePasswordFormChange = useCallback((patch: Partial<PasswordFormValues>) => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleChangeOwnPassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim() || !passwordForm.confirmPassword.trim()) {
      setPasswordError('Заполните все поля пароля.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Новый пароль должен быть не короче 8 символов.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Новый пароль и подтверждение должны совпадать.');
      return;
    }

    try {
      await changeOwnPasswordMutation.mutate(passwordForm);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordSuccess('Пароль успешно изменён.');
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Не удалось изменить пароль.'));
    }
  }, [changeOwnPasswordMutation, passwordForm]);

  const clearCompanyMessages = useCallback(() => {
    setCompanyError(null);
    setCompanySuccess(null);
  }, []);

  const updateCompanyForm = useCallback((patch: Partial<CompanySettingsFormValues>) => {
    clearCompanyMessages();
    setCompanyFormDraft((prev) => ({ ...(prev ?? companyBaseForm), ...patch }));
  }, [clearCompanyMessages, companyBaseForm]);

  const handleWorkingDayToggle = useCallback((day: WorkingDayValue) => {
    clearCompanyMessages();
    setCompanyFormDraft((prev) => {
      const currentForm = prev ?? companyBaseForm;
      const selectedDays = currentForm.workingDays.includes(day)
        ? currentForm.workingDays.filter((item) => item !== day)
        : [...currentForm.workingDays, day];

      return {
        ...currentForm,
        workingDays: WORKING_DAY_OPTIONS
          .map((option) => option.value)
          .filter((value) => selectedDays.includes(value)),
      };
    });
  }, [clearCompanyMessages, companyBaseForm]);

  const handleSaveCompanySettings = useCallback(async () => {
    clearCompanyMessages();

    if (!companyForm.centerName.trim()) {
      setCompanyError('Укажите название центра.');
      return;
    }

    if (companyForm.workingDays.length === 0) {
      setCompanyError('Выберите хотя бы один рабочий день.');
      return;
    }

    try {
      let nextLogoUrl = companyForm.logoUrl;

      if (companyLogoFile) {
        const uploadResult = await uploadCompanyLogoMutation.mutate(companyLogoFile);
        nextLogoUrl = uploadResult.url;
      }

      await updateCompanyMutation.mutate(
        mapCompanyFormToPayload({
          ...companyForm,
          logoUrl: nextLogoUrl,
        })
      );

      await refetchCompanySettings();
      setCompanyFormDraft(null);
      setCompanyLogoFile(null);
      setCompanySuccess('Настройки компании сохранены.');
    } catch (error) {
      setCompanyError(getErrorMessage(error, 'Не удалось сохранить настройки компании. Попробуйте ещё раз.'));
    }
  }, [
    clearCompanyMessages,
    companyForm,
    companyLogoFile,
    refetchCompanySettings,
    updateCompanyMutation,
    uploadCompanyLogoMutation,
  ]);

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setRoleModalKey((prev) => prev + 1);
    setIsEditRoleModalOpen(true);
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setRoleModalKey((prev) => prev + 1);
    setIsEditRoleModalOpen(true);
  };

  const handleIntegrationClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsIntegrationModalOpen(true);
  };

  const companyLogoDisplayUrl = companyForm.logoUrl;
  const isCompanySubmitting = updateCompanyMutation.loading || uploadCompanyLogoMutation.loading;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="crm-tab-shell">
        <div className="flex gap-2 flex-wrap">
          {SETTINGS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as SettingsTab)}
              className={`crm-tab-btn ${activeTab === tab.value ? 'crm-tab-btn-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Tab */}
      {activeTab === 'user' && (
        <div className="space-y-6">
          <div className="crm-surface p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Текущий тенант и тариф</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Данные читаются и сохраняются через `GET/PUT /api/v1/tenants/{'{id}'}` для текущего tenant context.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tenantId ? (
                  <Button variant="outline" onClick={() => void refetchTenant()} disabled={tenantLoading || updateTenantMutation.loading}>
                    {tenantLoading ? 'Обновляем...' : 'Обновить'}
                  </Button>
                ) : null}
                <Button onClick={() => void handleSaveTenant()} disabled={!tenantId || tenantLoading || updateTenantMutation.loading}>
                  {updateTenantMutation.loading ? 'Сохраняем...' : 'Сохранить'}
                </Button>
              </div>
            </div>

            {(tenantLoadError || tenantError || tenantSuccess) && (
              <div className="mt-4 space-y-2">
                {tenantLoadError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Не удалось загрузить данные тенанта: {tenantLoadError}
                  </div>
                )}
                {tenantError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {tenantError}
                  </div>
                )}
                {tenantSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {tenantSuccess}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-sm text-gray-500">Tenant ID</p>
                <p className="text-sm font-semibold text-gray-900 break-all">
                  {tenantData?.id || tenantId || 'Не найден'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Субдомен</p>
                <p className="text-lg font-semibold text-gray-900">{tenantData?.subdomain || 'Не указано'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Триал до</p>
                <p className="text-lg font-semibold text-gray-900">{formatIsoDate(tenantData?.trialEndsAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Лимит учеников</p>
                <p className="text-lg font-semibold text-gray-900">{tenantData?.maxStudents ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Лимит сотрудников</p>
                <p className="text-lg font-semibold text-gray-900">{tenantData?.maxStaff ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Создан</p>
                <p className="text-lg font-semibold text-gray-900">{formatIsoDate(tenantData?.createdAt)}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Название тенанта"
                value={tenantForm.name}
                onChange={(event) => updateTenantForm({ name: event.target.value })}
                placeholder="Введите название"
              />
              <Input
                label="Email"
                type="email"
                value={tenantForm.email}
                onChange={(event) => updateTenantForm({ email: event.target.value })}
                placeholder="Введите email"
              />
              <Input
                label="Телефон"
                value={tenantForm.phone}
                onChange={(event) => updateTenantForm({ phone: event.target.value })}
                placeholder="Введите телефон"
              />
              <Input
                label="Контактное лицо"
                value={tenantForm.contactPerson}
                onChange={(event) => updateTenantForm({ contactPerson: event.target.value })}
                placeholder="Введите контактное лицо"
              />
              <Select
                label="Статус"
                value={tenantForm.status}
                onChange={(event) => updateTenantForm({ status: event.target.value })}
              >
                {TENANT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Тариф"
                value={tenantForm.plan}
                onChange={(event) => updateTenantForm({ plan: event.target.value })}
              >
                {TENANT_PLAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Часовой пояс"
                value={tenantForm.timezone}
                onChange={(event) => updateTenantForm({ timezone: event.target.value })}
              >
                {TIMEZONES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Триал до"
                type="date"
                value={tenantForm.trialEndsAt}
                onChange={(event) => updateTenantForm({ trialEndsAt: event.target.value })}
              />
              <Input
                label="Лимит учеников"
                type="number"
                value={tenantForm.maxStudents}
                onChange={(event) => updateTenantForm({ maxStudents: event.target.value })}
                placeholder="Например, 1000"
              />
              <Input
                label="Лимит сотрудников"
                type="number"
                value={tenantForm.maxStaff}
                onChange={(event) => updateTenantForm({ maxStaff: event.target.value })}
                placeholder="Например, 50"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">Заметки</label>
              <textarea
                value={tenantForm.notes}
                onChange={(event) => updateTenantForm({ notes: event.target.value })}
                rows={4}
                className="w-full rounded-xl border border-[#dbe2e8] bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#25c4b8] focus:ring-2 focus:ring-[#b9f0ea]"
                placeholder="Внутренние заметки по тенанту"
              />
            </div>

            <div className="mt-6 rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
              Профиль тенанта теперь обновляется через `PUT /api/v1/tenants/{'{id}'}`. При этом отдельного публичного billing-flow для покупки или оплаты тарифа tenant-пользователем в документации всё ещё нет.
            </div>
          </div>

          <div className="crm-surface p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Личные данные</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Профиль загружается и сохраняется через `GET/PUT /api/v1/auth/profile`.
                </p>
              </div>
              <Button
                onClick={() => void handleSavePersonalProfile()}
                disabled={personalProfileLoading || updatePersonalProfileMutation.loading || uploadProfilePhotoMutation.loading}
              >
                {updatePersonalProfileMutation.loading || uploadProfilePhotoMutation.loading ? 'Сохраняем...' : 'Сохранить'}
              </Button>
            </div>

            {(personalProfileLoadError || profileError || profileSuccess) && (
              <div className="mt-4 space-y-2">
                {personalProfileLoadError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Не удалось загрузить профиль: {personalProfileLoadError}
                  </div>
                )}
                {profileError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {profileSuccess}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Фото</label>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#dbe2e8] bg-teal-100 text-teal-700 font-semibold text-xl"
                    style={personalProfileForm.photoUrl ? { backgroundImage: `url(${personalProfileForm.photoUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
                  >
                    {personalProfileForm.photoUrl ? '' : personalProfileForm.firstName.charAt(0) || personalProfileForm.email.charAt(0) || 'U'}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="text-sm text-gray-600"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        clearProfileMessages();
                        setProfilePhotoFile(file);
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      {profilePhotoFile ? `Выбран файл: ${profilePhotoFile.name}` : 'Файл будет загружен в папку avatars при сохранении.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Имя"
                  value={personalProfileForm.firstName}
                  onChange={(event) => updatePersonalProfileForm({ firstName: event.target.value })}
                />
                <Input
                  label="Фамилия"
                  value={personalProfileForm.lastName}
                  onChange={(event) => updatePersonalProfileForm({ lastName: event.target.value })}
                />
              </div>

              <Input
                label="Email"
                type="email"
                value={personalProfileForm.email}
                disabled
              />

              <Select
                label="Язык интерфейса"
                value={personalProfileForm.language}
                onChange={(event) => updatePersonalProfileForm({ language: event.target.value })}
                disabled={personalProfileLoading}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="crm-surface p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Смена пароля</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Пароль меняется через `POST /api/v1/auth/profile/change-password`.
                </p>
              </div>
              <Button onClick={() => void handleChangeOwnPassword()} disabled={changeOwnPasswordMutation.loading}>
                {changeOwnPasswordMutation.loading ? 'Сохраняем...' : 'Сохранить'}
              </Button>
            </div>

            {(passwordError || passwordSuccess) && (
              <div className="mt-4 space-y-2">
                {passwordError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {passwordSuccess}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-5">
              <Input
                label="Текущий пароль"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => handlePasswordFormChange({ currentPassword: event.target.value })}
                placeholder="Введите текущий пароль"
              />
              <Input
                label="Новый пароль"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => handlePasswordFormChange({ newPassword: event.target.value })}
                placeholder="Введите новый пароль"
              />
              <Input
                label="Повторите пароль"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => handlePasswordFormChange({ confirmPassword: event.target.value })}
                placeholder="Повторите новый пароль"
              />
            </div>
          </div>
        </div>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="crm-surface p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Настройки компании</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Данные этой вкладки теперь читаются и сохраняются через `GET/PUT /api/v1/settings`.
                </p>
              </div>
              <Button onClick={() => void handleSaveCompanySettings()} disabled={isCompanySubmitting}>
                {isCompanySubmitting ? 'Сохраняем...' : 'Сохранить настройки'}
              </Button>
            </div>

            {(companySettingsLoadError || companyError || companySuccess) && (
              <div className="mt-4 space-y-2">
                {companySettingsLoadError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Не удалось загрузить текущие настройки: {companySettingsLoadError}
                  </div>
                )}
                {companyError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {companyError}
                  </div>
                )}
                {companySuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {companySuccess}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="crm-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Профиль партнёра</h2>
            {companySettingsLoading && !companySettingsData && (
              <p className="mb-4 text-sm text-gray-500">Загружаем настройки компании...</p>
            )}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Название центра"
                value={companyForm.centerName}
                onChange={(event) => updateCompanyForm({ centerName: event.target.value })}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Логотип компании</label>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#dbe2e8] bg-[#f4f7f9] text-xs font-semibold text-[#5d6676]"
                    style={companyLogoDisplayUrl ? { backgroundImage: `url(${companyLogoDisplayUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
                  >
                    {companyLogoDisplayUrl ? '' : 'LOGO'}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="text-sm text-gray-600"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        clearCompanyMessages();
                        setCompanyLogoFile(file);
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      {companyLogoFile ? `Выбран файл: ${companyLogoFile.name}` : 'PNG, JPG, SVG. Файл загрузится при сохранении.'}
                    </p>
                  </div>
                </div>
              </div>
              <Input
                label="Основное направление"
                value={companyForm.mainDirection}
                onChange={(event) => updateCompanyForm({ mainDirection: event.target.value })}
              />
              <Input
                label="Город"
                value={companyForm.city}
                onChange={(event) => updateCompanyForm({ city: event.target.value })}
              />
              <Input
                label="Руководитель"
                value={companyForm.directorName}
                onChange={(event) => updateCompanyForm({ directorName: event.target.value })}
              />
              <Input
                label="Рабочий телефон"
                value={companyForm.workPhone}
                onChange={(event) => updateCompanyForm({ workPhone: event.target.value })}
              />
              <Input
                label="Корпоративный email"
                type="email"
                value={companyForm.corporateEmail}
                onChange={(event) => updateCompanyForm({ corporateEmail: event.target.value })}
              />
              <Input
                label="Адрес"
                value={companyForm.address}
                onChange={(event) => updateCompanyForm({ address: event.target.value })}
              />
              <Input
                label="Количество филиалов"
                type="number"
                value={companyForm.branchCount}
                onChange={(event) => updateCompanyForm({ branchCount: event.target.value })}
              />
            </div>
          </div>

          <div className="crm-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Базовые настройки</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
              <Select
                label="Валюта расчётов"
                value={companyForm.currency}
                onChange={(event) => updateCompanyForm({ currency: event.target.value })}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Часовой пояс"
                value={companyForm.timezone}
                onChange={(event) => updateCompanyForm({ timezone: event.target.value })}
              >
                {TIMEZONES.map((timezone) => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Язык интерфейса"
                value={companyForm.language}
                onChange={(event) => updateCompanyForm({ language: event.target.value })}
              >
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Цвет бренда"
                type="color"
                value={companyForm.brandColor}
                onChange={(event) => updateCompanyForm({ brandColor: event.target.value })}
              />
            </div>
          </div>

          <div className="crm-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Реквизиты</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Основание директора"
                value={companyForm.directorBasis}
                onChange={(event) => updateCompanyForm({ directorBasis: event.target.value })}
              />
              <Input
                label="Расчётный счёт"
                value={companyForm.bankAccount}
                onChange={(event) => updateCompanyForm({ bankAccount: event.target.value })}
              />
              <Input
                label="Банк"
                value={companyForm.bank}
                onChange={(event) => updateCompanyForm({ bank: event.target.value })}
              />
              <Input
                label="БИК"
                value={companyForm.bik}
                onChange={(event) => updateCompanyForm({ bik: event.target.value })}
              />
              <Input
                label="БИН"
                value={companyForm.bin}
                onChange={(event) => updateCompanyForm({ bin: event.target.value })}
              />
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[#5d6676]">Реквизиты и примечания</label>
              <textarea
                rows={4}
                value={companyForm.requisites}
                onChange={(event) => updateCompanyForm({ requisites: event.target.value })}
                className="crm-textarea resize-none"
                placeholder="Дополнительные банковские реквизиты, договорные данные и комментарии"
              />
            </div>
          </div>

          <div className="crm-surface p-6">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">График и учебный процесс</h2>
            <p className="mb-4 text-sm text-gray-500">
              Эти значения backend использует как базовые ограничения для расписания и занятий.
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Начало дня"
                type="time"
                value={companyForm.workingHoursStart}
                onChange={(event) => updateCompanyForm({ workingHoursStart: event.target.value })}
              />
              <Input
                label="Завершение дня"
                type="time"
                value={companyForm.workingHoursEnd}
                onChange={(event) => updateCompanyForm({ workingHoursEnd: event.target.value })}
              />
              <Input
                label="Длительность слота, мин"
                type="number"
                value={companyForm.slotDurationMin}
                onChange={(event) => updateCompanyForm({ slotDurationMin: event.target.value })}
              />
              <Input
                label="Лимит группы"
                type="number"
                value={companyForm.maxGroupSize}
                onChange={(event) => updateCompanyForm({ maxGroupSize: event.target.value })}
              />
              <Input
                label="Стандартный урок, мин"
                type="number"
                value={companyForm.defaultLessonDurationMin}
                onChange={(event) => updateCompanyForm({ defaultLessonDurationMin: event.target.value })}
              />
              <Input
                label="Пробный урок, мин"
                type="number"
                value={companyForm.trialLessonDurationMin}
                onChange={(event) => updateCompanyForm({ trialLessonDurationMin: event.target.value })}
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-[#5d6676]">Рабочие дни</p>
              <div className="flex flex-wrap gap-2">
                {WORKING_DAY_OPTIONS.map((day) => (
                  <label
                    key={day.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      companyForm.workingDays.includes(day.value)
                        ? 'border-[#25c4b8] bg-[#ecfbf8] text-[#16877f]'
                        : 'border-[#dbe2e8] bg-white text-[#5d6676]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={companyForm.workingDays.includes(day.value)}
                      onChange={() => handleWorkingDayToggle(day.value)}
                      className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="crm-surface p-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Посещаемость и лимиты</h2>
              <p className="mb-4 text-sm text-gray-500">
                Настройки автоматической отметки и окна редактирования посещаемости.
              </p>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={companyForm.autoMarkAttendance}
                    onChange={(event) => updateCompanyForm({ autoMarkAttendance: event.target.checked })}
                    className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Автоматически отмечать посещаемость по умолчанию
                  </span>
                </label>
                <Input
                  label="Окно редактирования посещаемости, дней"
                  type="number"
                  value={companyForm.attendanceWindowDays}
                  onChange={(event) => updateCompanyForm({ attendanceWindowDays: event.target.value })}
                />
              </div>
            </div>

            <div className="crm-surface p-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Уведомления</h2>
              <p className="mb-4 text-sm text-gray-500">
                Включение каналов и сроки напоминаний берутся из `SettingsDto`.
              </p>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={companyForm.smsEnabled}
                      onChange={(event) => updateCompanyForm({ smsEnabled: event.target.checked })}
                      className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
                    />
                    <span className="text-sm font-medium text-gray-700">SMS включены</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={companyForm.emailEnabled}
                      onChange={(event) => updateCompanyForm({ emailEnabled: event.target.checked })}
                      className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
                    />
                    <span className="text-sm font-medium text-gray-700">Email включён</span>
                  </label>
                </div>
                <Input
                  label="Имя отправителя SMS"
                  value={companyForm.smsSenderName}
                  onChange={(event) => updateCompanyForm({ smsSenderName: event.target.value })}
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Input
                    label="Напоминать о просрочке, дней"
                    type="number"
                    value={companyForm.latePaymentReminderDays}
                    onChange={(event) => updateCompanyForm({ latePaymentReminderDays: event.target.value })}
                  />
                  <Input
                    label="Напоминать о подписке, дней"
                    type="number"
                    value={companyForm.subscriptionExpiryReminderDays}
                    onChange={(event) => updateCompanyForm({ subscriptionExpiryReminderDays: event.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSaveCompanySettings()} disabled={isCompanySubmitting}>
              {isCompanySubmitting ? 'Сохраняем...' : 'Сохранить настройки'}
            </Button>
          </div>
        </div>
      )}

      {/* Access Tab */}
      {activeTab === 'access' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Пользователи</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Показываются только пользователи текущего учебного центра.
              </p>
            </div>
            <Button icon={Plus} onClick={handleCreateUser} disabled={!tenantId}>
              Добавить пользователя
            </Button>
          </div>
          {!tenantId ? (
            <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-sm text-amber-700">
              Tenant context не найден. Перезайдите в систему, чтобы увидеть пользователей своего УЦ.
            </div>
          ) : null}
          {usersError ? (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
              Не удалось загрузить пользователей: {usersError}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">ФИО</th>
                  <th className="crm-table-th">Email</th>
                  <th className="crm-table-th">Роль</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {usersLoading ? (
                  <tr className="crm-table-row">
                    <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                      Загружаем пользователей текущего УЦ...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr className="crm-table-row">
                    <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                      {tenantId
                        ? 'Пользователи этого учебного центра не найдены.'
                        : 'Нет tenant-контекста для выборки пользователей.'}
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id} className="crm-table-row">
                      <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                          {user.displayRole}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleEditUser(user)}
                            disabled={editingUserId === user.id}
                            className={`${
                              editingUserId === user.id
                                ? 'cursor-wait text-gray-300'
                                : 'text-teal-600 hover:text-teal-700'
                            }`}
                            title="Редактировать пользователя"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenResetUserPassword(user)}
                            className="text-amber-600 hover:text-amber-700"
                            title="Сбросить пароль"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {user.isDeletable ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Деактивировать пользователя"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Нельзя удалить</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Роли</h2>
            <Button icon={Plus} onClick={handleCreateRole}>
              Добавить роль
            </Button>
          </div>
          {(rolesError || permissionsError) && (
            <div className="px-6 pt-4">
              {rolesError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Не удалось загрузить роли: {rolesError}
                </div>
              )}
              {!rolesError && permissionsError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Не удалось загрузить permissions: {permissionsError}
                </div>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Название</th>
                  <th className="crm-table-th">Описание</th>
                  <th className="crm-table-th">Permissions</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {rolesLoading ? (
                  <tr className="crm-table-row">
                    <td colSpan={5} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Загружаем роли...
                    </td>
                  </tr>
                ) : roles.length > 0 ? (
                  roles.map((role, index) => (
                    <tr key={role.id} className="crm-table-row">
                      <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{role.description || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {role.permissions.length > 0 ? `${role.permissions.length} шт.` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRole(role)}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="crm-table-row">
                    <td colSpan={5} className="crm-table-cell py-10 text-center text-sm text-[#8a93a3]">
                      Роли не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other Tabs Placeholders */}
      {activeTab === 'rooms' && (
        <div className="crm-table-wrap overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Помещения</h2>
            <Button icon={Plus} onClick={() => { setSelectedRoom(null); setIsAddRoomModalOpen(true); }}>
              Добавить помещение
            </Button>
          </div>
          {roomsError ? (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
              Не удалось загрузить помещения: {roomsError}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="crm-table-head">
                <tr>
                  <th className="crm-table-th">#</th>
                  <th className="crm-table-th">Название</th>
                  <th className="crm-table-th">Действия</th>
                </tr>
              </thead>
              <tbody className="crm-table-body">
                {roomsLoading ? (
                  <tr className="crm-table-row">
                    <td colSpan={3} className="px-6 py-6 text-sm text-[#556070]">
                      Загружаем помещения...
                    </td>
                  </tr>
                ) : rooms.length === 0 ? (
                  <tr className="crm-table-row">
                    <td colSpan={3} className="px-6 py-6 text-sm text-[#556070]">
                      Помещения пока не настроены.
                    </td>
                  </tr>
                ) : (
                  rooms.map((room, index) => (
                    <tr key={room.id} className="crm-table-row">
                      <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{room.name}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditRoom(room)}
                          className="text-teal-600 hover:text-teal-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => void handleDeleteRoom(room.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'statuses' && (
        <div className="space-y-6">
          {/* Attendance Statuses */}
          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Статусы посещений</h2>
              <Button icon={Plus} onClick={handleCreateAttendanceStatus}>
                Добавить статус посещения
              </Button>
            </div>
            {attendanceStatusesError ? (
              <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
                {attendanceStatusesError}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Название</th>
                    <th className="crm-table-th">Списывать</th>
                    <th className="crm-table-th">Оплачивать</th>
                    <th className="crm-table-th">Отмечать посещение</th>
                    <th className="crm-table-th">Порядок</th>
                    <th className="crm-table-th">Тип</th>
                    <th className="crm-table-th">Цвет</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {attendanceStatusesLoading ? (
                    <tr className="crm-table-row">
                      <td colSpan={9} className="px-6 py-6 text-sm text-[#556070]">
                        Загружаем статусы посещений...
                      </td>
                    </tr>
                  ) : attendanceStatuses.length === 0 ? (
                    <tr className="crm-table-row">
                      <td colSpan={9} className="px-6 py-6 text-sm text-[#556070]">
                        Статусы посещений пока не настроены.
                      </td>
                    </tr>
                  ) : (
                    attendanceStatuses.map((status, index) => (
                      <tr key={status.id} className="crm-table-row">
                        <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{status.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{status.deduct ? 'Да' : 'Нет'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{status.pay ? 'Да' : 'Нет'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{status.markAttendance ? 'Да' : 'Нет'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{status.sortOrder}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {status.systemStatus ? 'Системный' : 'Пользовательский'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-6 rounded" style={{ backgroundColor: status.color }} />
                        </td>
                        <td className="flex items-center gap-2 px-6 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttendanceStatus({
                                id: status.id,
                                name: status.name,
                                deductLesson: status.deduct,
                                requirePayment: status.pay,
                                countAsAttended: status.markAttendance,
                                color: status.color,
                                sortOrder: status.sortOrder,
                                systemStatus: status.systemStatus,
                              });
                              setIsAddAttendanceStatusModalOpen(true);
                            }}
                            className="text-teal-600 hover:text-teal-700"
                            title="Редактировать статус"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttendanceStatus(status.id, status.systemStatus)}
                            className={`${
                              status.systemStatus
                                ? 'cursor-not-allowed text-gray-300'
                                : 'text-red-600 hover:text-red-700'
                            }`}
                            title={status.systemStatus ? 'Системный статус нельзя удалить' : 'Удалить статус'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff Statuses */}
          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Статусы сотрудников</h2>
              <Button icon={Plus} onClick={() => { setSelectedStaffStatus(null); setIsAddStaffStatusModalOpen(true); }}>
                Добавить статус
              </Button>
            </div>
            {staffStatusesError ? (
              <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
                {staffStatusesError}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Название</th>
                    <th className="crm-table-th">Цвет</th>
                    <th className="crm-table-th">Порядок</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {staffStatusesLoading ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Загружаем статусы сотрудников...
                      </td>
                    </tr>
                  ) : staffStatuses.length === 0 ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Кастомные статусы сотрудников пока не настроены.
                      </td>
                    </tr>
                  ) : (
                    staffStatuses.map((status, index) => (
                      <tr key={status.id} className="crm-table-row">
                        <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{status.name}</td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-block h-5 w-5 rounded"
                            style={{ backgroundColor: status.color }}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{status.sortOrder}</td>
                        <td className="flex items-center gap-2 px-6 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaffStatus({ id: status.id, name: status.name, color: status.color, sortOrder: status.sortOrder });
                              setIsAddStaffStatusModalOpen(true);
                            }}
                            className="text-teal-600 hover:text-teal-700"
                            title="Редактировать статус"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaffStatus(status.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Удалить статус"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Payment Sources */}
          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Источники платежей</h2>
              <Button icon={Plus} onClick={handleCreatePaymentSource}>
                Добавить источник платежа
              </Button>
            </div>
            {paymentSourcesError ? (
              <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
                {paymentSourcesError}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Название</th>
                    <th className="crm-table-th">Порядок</th>
                    <th className="crm-table-th">Активен</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {paymentSourcesLoading ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Загружаем источники платежей...
                      </td>
                    </tr>
                  ) : paymentSources.length === 0 ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Источники платежей пока не настроены.
                      </td>
                    </tr>
                  ) : (
                    paymentSources.map((source, index) => (
                      <tr key={source.id} className="crm-table-row">
                        <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{source.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{source.sortOrder}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{source.active ? 'Да' : 'Нет'}</td>
                        <td className="flex items-center gap-2 px-6 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPaymentSource({
                                id: source.id,
                                name: source.name,
                                sortOrder: source.sortOrder,
                                active: source.active,
                              });
                              setIsAddPaymentSourceModalOpen(true);
                            }}
                            className="text-teal-600 hover:text-teal-700"
                            title="Редактировать источник"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentSource(source.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Удалить источник"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Income Categories */}
          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Статьи доходов</h2>
              <Button icon={Plus} onClick={() => { setSelectedIncomeCategory(null); setIsAddIncomeCategoryModalOpen(true); }}>
                Добавить статью
              </Button>
            </div>
            {incomeCategoriesError ? (
              <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
                {incomeCategoriesError}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Название</th>
                    <th className="crm-table-th">Порядок</th>
                    <th className="crm-table-th">Активна</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {incomeCategoriesLoading ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Загружаем статьи доходов...
                      </td>
                    </tr>
                  ) : incomeCategories.length === 0 ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Статьи доходов пока не настроены.
                      </td>
                    </tr>
                  ) : (
                    incomeCategories.map((category, index) => (
                      <tr key={category.id} className="crm-table-row">
                        <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{category.sortOrder}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{category.active ? 'Да' : 'Нет'}</td>
                        <td className="flex items-center gap-2 px-6 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIncomeCategory({ id: category.id, name: category.name, sortOrder: category.sortOrder, active: category.active });
                              setIsAddIncomeCategoryModalOpen(true);
                            }}
                            className="text-teal-600 hover:text-teal-700"
                            title="Редактировать статью"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIncomeCategory(category.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Удалить статью"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="crm-table-wrap overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e6ebf0] px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Статьи расходов</h2>
              <Button icon={Plus} onClick={() => { setSelectedExpenseCategory(null); setIsAddExpenseCategoryModalOpen(true); }}>
                Добавить статью
              </Button>
            </div>
            {expenseCategoriesError ? (
              <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
                {expenseCategoriesError}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="crm-table-head">
                  <tr>
                    <th className="crm-table-th">#</th>
                    <th className="crm-table-th">Название</th>
                    <th className="crm-table-th">Порядок</th>
                    <th className="crm-table-th">Активна</th>
                    <th className="crm-table-th">Действия</th>
                  </tr>
                </thead>
                <tbody className="crm-table-body">
                  {expenseCategoriesLoading ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Загружаем статьи расходов...
                      </td>
                    </tr>
                  ) : expenseCategories.length === 0 ? (
                    <tr className="crm-table-row">
                      <td colSpan={5} className="px-6 py-6 text-sm text-[#556070]">
                        Статьи расходов пока не настроены.
                      </td>
                    </tr>
                  ) : (
                    expenseCategories.map((category, index) => (
                      <tr key={category.id} className="crm-table-row">
                        <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{category.sortOrder}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{category.active ? 'Да' : 'Нет'}</td>
                        <td className="flex items-center gap-2 px-6 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExpenseCategory({ id: category.id, name: category.name, sortOrder: category.sortOrder, active: category.active });
                              setIsAddExpenseCategoryModalOpen(true);
                            }}
                            className="text-teal-600 hover:text-teal-700"
                            title="Редактировать статью"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpenseCategory(category.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Удалить статью"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="crm-surface p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Рекомендованные</h2>
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            В текущей backend-документации нет публичных endpoints для сохранения интеграций. Вкладка оставлена как каталог доступных подключений без ложной локальной “сохранённости”.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTEGRATIONS.map(integration => (
              <button
                key={integration.id}
                onClick={() => handleIntegrationClick(integration)}
                className="p-4 border-2 border-gray-200 rounded-2xl hover:border-teal-500 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{integration.name}</h3>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <AddUserModal
        key={`user-${selectedUser?.id ?? 'new'}-${isAddUserModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
        initialValue={selectedUser}
        permissionsLoaded={selectedUser?.permissionsLoaded ?? true}
        roleOptions={AUTH_USER_ROLE_OPTIONS}
        availablePermissions={availablePermissions}
        isSubmitting={createUserMutation.loading || updateUserMutation.loading}
      />
      <ResetUserPasswordModal
        key={`user-reset-${selectedPasswordUser?.id ?? 'new'}-${isResetUserPasswordModalOpen ? 'open' : 'closed'}`}
        isOpen={isResetUserPasswordModalOpen}
        onClose={() => {
          setIsResetUserPasswordModalOpen(false);
          setSelectedPasswordUser(null);
        }}
        onSave={handleResetUserPassword}
        userName={selectedPasswordUser?.name}
        isSubmitting={resetUserPasswordMutation.loading}
      />

      <EditRoleModal
        key={`${selectedRole?.id ?? 'new'}-${roleModalKey}`}
        isOpen={isEditRoleModalOpen}
        onClose={() => {
          setIsEditRoleModalOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        availablePermissions={availablePermissions}
        onSave={handleSaveRole}
        isSubmitting={createRoleMutation.loading || updateRoleMutation.loading || permissionsLoading}
      />

      <AddRoomModal
        key={`room-${selectedRoom?.id ?? 'new'}-${isAddRoomModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddRoomModalOpen}
        onClose={() => {
          setIsAddRoomModalOpen(false);
          setSelectedRoom(null);
        }}
        onSave={handleSaveRoom}
        initialValue={selectedRoom}
        isSubmitting={createRoomMutation.loading || updateRoomMutation.loading}
      />

      <AddAttendanceStatusModal
        key={`${selectedAttendanceStatus?.id ?? 'new'}-${isAddAttendanceStatusModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddAttendanceStatusModalOpen}
        onClose={() => {
          setIsAddAttendanceStatusModalOpen(false);
          setSelectedAttendanceStatus(null);
        }}
        onSave={handleSaveAttendanceStatus}
        initialValue={selectedAttendanceStatus}
        isSubmitting={createAttendanceStatusMutation.loading || updateAttendanceStatusMutation.loading}
      />

      <AddPaymentSourceModal
        key={`${selectedPaymentSource?.id ?? 'new'}-${isAddPaymentSourceModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddPaymentSourceModalOpen}
        onClose={() => {
          setIsAddPaymentSourceModalOpen(false);
          setSelectedPaymentSource(null);
        }}
        onSave={handleSavePaymentSource}
        initialValue={selectedPaymentSource}
        isSubmitting={createPaymentSourceMutation.loading || updatePaymentSourceMutation.loading}
      />

      <IntegrationModal
        isOpen={isIntegrationModalOpen}
        onClose={() => setIsIntegrationModalOpen(false)}
        integration={selectedIntegration}
      />

      <AddStaffStatusModal
        key={`${selectedStaffStatus?.id ?? 'new'}-${isAddStaffStatusModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddStaffStatusModalOpen}
        onClose={() => { setIsAddStaffStatusModalOpen(false); setSelectedStaffStatus(null); }}
        onSave={handleSaveStaffStatus}
        initialValue={selectedStaffStatus}
        isSubmitting={createStaffStatusMutation.loading || updateStaffStatusMutation.loading}
      />

      <AddIncomeCategoryModal
        key={`income-${selectedIncomeCategory?.id ?? 'new'}-${isAddIncomeCategoryModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddIncomeCategoryModalOpen}
        onClose={() => { setIsAddIncomeCategoryModalOpen(false); setSelectedIncomeCategory(null); }}
        onSave={handleSaveIncomeCategory}
        initialValue={selectedIncomeCategory}
        isSubmitting={createIncomeCategoryMutation.loading || updateIncomeCategoryMutation.loading}
      />

      <AddExpenseCategoryModal
        key={`expense-${selectedExpenseCategory?.id ?? 'new'}-${isAddExpenseCategoryModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddExpenseCategoryModalOpen}
        onClose={() => { setIsAddExpenseCategoryModalOpen(false); setSelectedExpenseCategory(null); }}
        onSave={handleSaveExpenseCategory}
        initialValue={selectedExpenseCategory}
        isSubmitting={createExpenseCategoryMutation.loading || updateExpenseCategoryMutation.loading}
      />
    </div>
  );
}
