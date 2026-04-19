import api from '../api';
import type {
  ApiResponse,
  SettingsDto,
  RoleConfigDto,
  PaymentSourceDto,
  AttendanceStatusConfigDto,
  StaffStatusConfigDto,
  FinanceCategoryConfigDto,
  KpaySettingsDto,
  UpdateKpaySettingsRequest,
  ApiPaySettingsDto,
  UpdateApiPaySettingsRequest,
  AisarSettingsDto,
  UpdateAisarSettingsRequest,
  FtelecomSettingsDto,
  UpdateFtelecomSettingsRequest,
  ZadarmaSettingsDto,
  UpdateZadarmaSettingsRequest,
  GoogleDriveBackupSettingsDto,
  UpdateGoogleDriveBackupSettingsRequest,
  YandexDiskBackupSettingsDto,
  UpdateYandexDiskBackupSettingsRequest,
  CloudBackupRunResultDto,
} from './types';

// ─── Settings Service ───────────────────────────────────────────

export const settingsService = {
  /** Get center settings */
  async get() {
    const response = await api.get<ApiResponse<SettingsDto>>('/api/v1/settings');
    return response.data;
  },

  /** Update center settings */
  async update(data: Partial<SettingsDto>) {
    const response = await api.put<ApiResponse<SettingsDto>>('/api/v1/settings', data);
    return response.data;
  },

  /** Upload logo and update logoUrl in settings */
  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<SettingsDto>>('/api/v1/settings/logo', formData);
    return response.data;
  },

  // ─── Roles ──────────────────────────────────────

  /** Get all roles */
  async getRoles() {
    const response = await api.get<ApiResponse<RoleConfigDto[]>>('/api/v1/settings/roles');
    return response.data;
  },

  /** Create role */
  async createRole(data: { name: string; description?: string; permissions: string[] }) {
    const response = await api.post<ApiResponse<RoleConfigDto>>('/api/v1/settings/roles', data);
    return response.data;
  },

  /** Update role */
  async updateRole(id: string, data: Partial<{ name: string; description: string; permissions: string[] }>) {
    const response = await api.put<ApiResponse<RoleConfigDto>>(`/api/v1/settings/roles/${id}`, data);
    return response.data;
  },

  /** Delete role */
  async deleteRole(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/settings/roles/${id}`);
    return response.data;
  },

  /** Get all available permissions */
  async getPermissions() {
    const response = await api.get<ApiResponse<string[]>>('/api/v1/settings/roles/permissions');
    return response.data;
  },

  // ─── Payment Sources ────────────────────────────

  /** Get payment sources */
  async getPaymentSources() {
    const response = await api.get<ApiResponse<PaymentSourceDto[]>>('/api/v1/settings/payment-sources');
    return response.data;
  },

  /** Create payment source */
  async createPaymentSource(data: { name: string; sortOrder?: number; active?: boolean }) {
    const response = await api.post<ApiResponse<PaymentSourceDto>>('/api/v1/settings/payment-sources', data);
    return response.data;
  },

  /** Update payment source */
  async updatePaymentSource(
    id: string,
    data: Partial<{ name: string; sortOrder: number; active: boolean }>
  ) {
    const response = await api.put<ApiResponse<PaymentSourceDto>>(`/api/v1/settings/payment-sources/${id}`, data);
    return response.data;
  },

  /** Delete payment source */
  async deletePaymentSource(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/settings/payment-sources/${id}`);
    return response.data;
  },

  // ─── Attendance Statuses ────────────────────────

  /** Get attendance statuses config */
  async getAttendanceStatuses() {
    const response = await api.get<ApiResponse<AttendanceStatusConfigDto[]>>('/api/v1/settings/attendance-statuses');
    return response.data;
  },

  /** Create attendance status */
  async createAttendanceStatus(data: Omit<AttendanceStatusConfigDto, 'id' | 'systemStatus'>) {
    const response = await api.post<ApiResponse<AttendanceStatusConfigDto>>('/api/v1/settings/attendance-statuses', data);
    return response.data;
  },

  /** Update attendance status */
  async updateAttendanceStatus(id: string, data: Partial<AttendanceStatusConfigDto>) {
    const response = await api.put<ApiResponse<AttendanceStatusConfigDto>>(`/api/v1/settings/attendance-statuses/${id}`, data);
    return response.data;
  },

  /** Delete attendance status */
  async deleteAttendanceStatus(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/settings/attendance-statuses/${id}`);
    return response.data;
  },

  // ─── Staff Statuses ─────────────────────────────

  /** Get custom staff statuses */
  async getStaffStatuses() {
    const response = await api.get<ApiResponse<StaffStatusConfigDto[]>>('/api/v1/settings/staff-statuses');
    return response.data;
  },

  /** Create custom staff status */
  async createStaffStatus(data: { name: string; color?: string | null; sortOrder?: number; active?: boolean }) {
    const response = await api.post<ApiResponse<StaffStatusConfigDto>>('/api/v1/settings/staff-statuses', data);
    return response.data;
  },

  /** Update custom staff status */
  async updateStaffStatus(id: string, data: Partial<{ name: string; color: string | null; sortOrder: number; active: boolean }>) {
    const response = await api.put<ApiResponse<StaffStatusConfigDto>>(`/api/v1/settings/staff-statuses/${id}`, data);
    return response.data;
  },

  /** Delete custom staff status */
  async deleteStaffStatus(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/settings/staff-statuses/${id}`);
    return response.data;
  },

  // ─── Income Categories ──────────────────────────

  /** Get income categories */
  async getIncomeCategories() {
    const response = await api.get<ApiResponse<FinanceCategoryConfigDto[]>>('/api/v1/settings/income-categories');
    return response.data;
  },

  /** Create income category */
  async createIncomeCategory(data: { name: string; color?: string | null; sortOrder?: number; active?: boolean }) {
    const response = await api.post<ApiResponse<FinanceCategoryConfigDto>>('/api/v1/settings/income-categories', data);
    return response.data;
  },

  /** Update income category */
  async updateIncomeCategory(id: string, data: Partial<{ name: string; color: string | null; sortOrder: number; active: boolean }>) {
    const response = await api.put<ApiResponse<FinanceCategoryConfigDto>>(`/api/v1/settings/income-categories/${id}`, data);
    return response.data;
  },

  /** Delete income category */
  async deleteIncomeCategory(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/settings/income-categories/${id}`);
    return response.data;
  },

  // ─── Expense Categories ─────────────────────────

  /** Get expense categories */
  async getExpenseCategories() {
    const response = await api.get<ApiResponse<FinanceCategoryConfigDto[]>>('/api/v1/settings/expense-categories');
    return response.data;
  },

  /** Create expense category */
  async createExpenseCategory(data: { name: string; color?: string | null; sortOrder?: number; active?: boolean }) {
    const response = await api.post<ApiResponse<FinanceCategoryConfigDto>>('/api/v1/settings/expense-categories', data);
    return response.data;
  },

  /** Update expense category */
  async updateExpenseCategory(id: string, data: Partial<{ name: string; color: string | null; sortOrder: number; active: boolean }>) {
    const response = await api.put<ApiResponse<FinanceCategoryConfigDto>>(`/api/v1/settings/expense-categories/${id}`, data);
    return response.data;
  },

  /** Delete expense category */
  async deleteExpenseCategory(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/settings/expense-categories/${id}`);
    return response.data;
  },

  // ─── KPAY Integration ───────────────────────────

  /** Get KPAY settings */
  async getKpaySettings() {
    const response = await api.get<ApiResponse<KpaySettingsDto>>('/api/v1/settings/kpay');
    return response.data;
  },

  /** Update KPAY settings */
  async updateKpaySettings(data: UpdateKpaySettingsRequest) {
    const response = await api.put<ApiResponse<KpaySettingsDto>>('/api/v1/settings/kpay', data);
    return response.data;
  },

  // ─── ApiPay Integration ─────────────────────────

  /** Get ApiPay settings */
  async getApiPaySettings() {
    const response = await api.get<ApiResponse<ApiPaySettingsDto>>('/api/v1/settings/apipay');
    return response.data;
  },

  /** Update ApiPay settings */
  async updateApiPaySettings(data: UpdateApiPaySettingsRequest) {
    const response = await api.put<ApiResponse<ApiPaySettingsDto>>('/api/v1/settings/apipay', data);
    return response.data;
  },

  // ─── AISAR Integration ──────────────────────────

  /** Get AISAR settings */
  async getAisarSettings() {
    const response = await api.get<ApiResponse<AisarSettingsDto>>('/api/v1/settings/aisar');
    return response.data;
  },

  /** Update AISAR settings */
  async updateAisarSettings(data: UpdateAisarSettingsRequest) {
    const response = await api.put<ApiResponse<AisarSettingsDto>>('/api/v1/settings/aisar', data);
    return response.data;
  },

  // ─── Freedom Telecom Integration ───────────────

  /** Get Freedom Telecom settings */
  async getFtelecomSettings() {
    const response = await api.get<ApiResponse<FtelecomSettingsDto>>('/api/v1/settings/ftelecom');
    return response.data;
  },

  /** Update Freedom Telecom settings */
  async updateFtelecomSettings(data: UpdateFtelecomSettingsRequest) {
    const response = await api.put<ApiResponse<FtelecomSettingsDto>>('/api/v1/settings/ftelecom', data);
    return response.data;
  },

  // ─── Zadarma Integration ───────────────────────

  /** Get Zadarma settings */
  async getZadarmaSettings() {
    const response = await api.get<ApiResponse<ZadarmaSettingsDto>>('/api/v1/settings/zadarma');
    return response.data;
  },

  /** Update Zadarma settings */
  async updateZadarmaSettings(data: UpdateZadarmaSettingsRequest) {
    const response = await api.put<ApiResponse<ZadarmaSettingsDto>>('/api/v1/settings/zadarma', data);
    return response.data;
  },

  // ─── Google Drive Backup ───────────────────────

  /** Get Google Drive backup settings */
  async getGoogleDriveBackupSettings() {
    const response = await api.get<ApiResponse<GoogleDriveBackupSettingsDto>>('/api/v1/settings/google-drive-backup');
    return response.data;
  },

  /** Get OAuth connect URL for Google Drive */
  async getGoogleDriveOAuthConnectUrl() {
    const response = await api.get<ApiResponse<string>>('/api/v1/settings/google-drive-backup/oauth/connect-url');
    return response.data;
  },

  /** Update Google Drive backup settings */
  async updateGoogleDriveBackupSettings(data: UpdateGoogleDriveBackupSettingsRequest) {
    const response = await api.put<ApiResponse<GoogleDriveBackupSettingsDto>>('/api/v1/settings/google-drive-backup', data);
    return response.data;
  },

  /** Run Google Drive backup */
  async runGoogleDriveBackup() {
    const response = await api.post<ApiResponse<CloudBackupRunResultDto>>('/api/v1/settings/google-drive-backup/run');
    return response.data;
  },

  // ─── Yandex Disk Backup ────────────────────────

  /** Get Yandex Disk backup settings */
  async getYandexDiskBackupSettings() {
    const response = await api.get<ApiResponse<YandexDiskBackupSettingsDto>>('/api/v1/settings/yandex-disk-backup');
    return response.data;
  },

  /** Get OAuth connect URL for Yandex Disk */
  async getYandexDiskOAuthConnectUrl() {
    const response = await api.get<ApiResponse<string>>('/api/v1/settings/yandex-disk-backup/oauth/connect-url');
    return response.data;
  },

  /** Update Yandex Disk backup settings */
  async updateYandexDiskBackupSettings(data: UpdateYandexDiskBackupSettingsRequest) {
    const response = await api.put<ApiResponse<YandexDiskBackupSettingsDto>>('/api/v1/settings/yandex-disk-backup', data);
    return response.data;
  },

  /** Run Yandex Disk backup */
  async runYandexDiskBackup() {
    const response = await api.post<ApiResponse<CloudBackupRunResultDto>>('/api/v1/settings/yandex-disk-backup/run');
    return response.data;
  },
};
