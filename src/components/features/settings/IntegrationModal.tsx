import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Integration } from '@/types/settings-data';
import {
  settingsService,
  type CloudBackupRunResultDto,
  type ContactRecipientField,
  type UpdateAisarSettingsRequest,
  type UpdateApiPaySettingsRequest,
  type UpdateFtelecomSettingsRequest,
  type UpdateGoogleDriveBackupSettingsRequest,
  type UpdateKpaySettingsRequest,
  type UpdateYandexDiskBackupSettingsRequest,
  type UpdateZadarmaSettingsRequest,
} from '@/lib/api';
import { pushToast } from '@/lib/toast';

const CONTACT_RECIPIENT_OPTIONS: Array<{ value: ContactRecipientField; label: string }> = [
  { value: 'PHONE', label: 'Телефон из карточки' },
  { value: 'STUDENT_PHONE', label: 'Телефон ученика' },
  { value: 'PARENT_PHONE', label: 'Телефон родителя' },
  { value: 'ADDITIONAL_PHONE_1', label: 'Доп. телефон №1' },
];

const CONFIGURABLE_INTEGRATIONS = new Set([
  'kpay',
  'apipay',
  'aisar',
  'ftelecom',
  'zadarma',
  'google-drive-backup',
  'yandex-disk-backup',
]);

const BACKUP_INTEGRATIONS = new Set(['google-drive-backup', 'yandex-disk-backup']);
const INTEGRATIONS_UPDATED_EVENT = '1edu:integrations-updated';

type IntegrationDraft = {
  enabled: boolean;
  merchantId: string;
  apiBaseUrl: string;
  recipientField: ContactRecipientField;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  crmToken: string;
  userKey: string;
  userSecret: string;
  folderId: string;
  folderPath: string;
  accessToken: string;
};

type IntegrationMeta = {
  configured: boolean;
  apiKeyMasked?: string | null;
  apiSecretMasked?: string | null;
  webhookSecretMasked?: string | null;
  crmTokenMasked?: string | null;
  userKeyMasked?: string | null;
  userSecretMasked?: string | null;
  accessTokenMasked?: string | null;
  webhookUrl?: string | null;
  signatureHeader?: string | null;
  signatureAlgorithm?: string | null;
  validationMode?: string | null;
  tokenField?: string | null;
  lastBackupAt?: string | null;
  oauthConnectUrl?: string | null;
};

function getInitialDraft(): IntegrationDraft {
  return {
    enabled: false,
    merchantId: '',
    apiBaseUrl: '',
    recipientField: 'PHONE',
    apiKey: '',
    apiSecret: '',
    webhookSecret: '',
    crmToken: '',
    userKey: '',
    userSecret: '',
    folderId: '',
    folderPath: '',
    accessToken: '',
  };
}

function toNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function renderEnabledToggle(params: {
  title: string;
  enabled: boolean;
  enabledText: string;
  disabledText: string;
  onToggle: () => void;
}) {
  const {
    title,
    enabled,
    enabledText,
    disabledText,
    onToggle,
  } = params;

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#1f2530]">{title}</p>
        <p className="mt-0.5 text-xs text-[#5d6676]">{enabled ? enabledText : disabledText}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#467aff]/40 ${
          enabled ? 'border-[#467aff] bg-[#467aff]' : 'border-[#cfd7e3] bg-white'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.18)] transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration | null;
  onSaved?: (payload: { integrationId: string; enabled: boolean; configured: boolean }) => void;
}

export const IntegrationModal = ({ isOpen, onClose, integration, onSaved }: IntegrationModalProps) => {
  const integrationId = integration?.id ?? null;
  const isConfigurable = integrationId ? CONFIGURABLE_INTEGRATIONS.has(integrationId) : false;
  const isBackupIntegration = integrationId ? BACKUP_INTEGRATIONS.has(integrationId) : false;

  const [draft, setDraft] = useState<IntegrationDraft>(getInitialDraft);
  const [meta, setMeta] = useState<IntegrationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [runningBackup, setRunningBackup] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [lastRunResult, setLastRunResult] = useState<CloudBackupRunResultDto | null>(null);
  const latestLoadRequestIdRef = useRef(0);
  const draftRef = useRef<IntegrationDraft>(getInitialDraft());

  const applyDraft = (next: IntegrationDraft | ((prev: IntegrationDraft) => IntegrationDraft)) => {
    setDraft((prev) => {
      const resolved = typeof next === 'function'
        ? (next as (prev: IntegrationDraft) => IntegrationDraft)(prev)
        : next;
      draftRef.current = resolved;
      return resolved;
    });
  };

  const toggleEnabled = () => {
    applyDraft((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleCopyValue = async (value: string, label: string) => {
    const normalized = value.trim();
    if (!normalized) {
      pushToast({ message: `${label}: нечего копировать.`, tone: 'info' });
      return;
    }

    const fallbackCopy = () => {
      if (typeof document === 'undefined') {
        return false;
      }

      const textArea = document.createElement('textarea');
      textArea.value = normalized;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      let copied = false;

      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }

      document.body.removeChild(textArea);
      return copied;
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalized);
      } else if (!fallbackCopy()) {
        throw new Error('Clipboard API unavailable');
      }

      pushToast({ message: `${label} скопирован.`, tone: 'success' });
    } catch {
      if (fallbackCopy()) {
        pushToast({ message: `${label} скопирован.`, tone: 'success' });
      } else {
        pushToast({ message: `Не удалось скопировать ${label}.`, tone: 'error' });
      }
    }
  };

  const renderSecretField = (params: {
    label: string;
    value: string;
    placeholder: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    maskedValue?: string | null;
    type?: 'text' | 'password';
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <Input
          className="flex-1"
          label={params.label}
          type={params.type ?? 'password'}
          autoComplete={params.type === 'text' ? 'off' : 'new-password'}
          spellCheck={false}
          value={params.value}
          onChange={params.onChange}
          placeholder={params.placeholder}
        />
        <button
          type="button"
          onClick={() => void handleCopyValue(params.value, params.label)}
          title={`Скопировать ${params.label}`}
          aria-label={`Скопировать ${params.label}`}
          className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dbe2e8] bg-white text-[#5d6676] transition-colors hover:border-[#467aff] hover:text-[#3568eb]"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-[#8c95a3]">
        {params.maskedValue ? `Текущее значение: ${params.maskedValue}` : 'Сейчас не задано'}
      </p>
    </div>
  );

  useEffect(() => {
    if (!isOpen) {
      latestLoadRequestIdRef.current += 1;
      setLoadError(null);
      setSaveError(null);
      setBackupError(null);
      setLastRunResult(null);
      return;
    }

    if (!integrationId || !CONFIGURABLE_INTEGRATIONS.has(integrationId)) {
      latestLoadRequestIdRef.current += 1;
      applyDraft(getInitialDraft());
      setMeta(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      const requestId = ++latestLoadRequestIdRef.current;
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      setBackupError(null);
      setLastRunResult(null);

      try {
        const nextDraft = getInitialDraft();

        switch (integrationId) {
          case 'kpay': {
            const result = await settingsService.getKpaySettings();
            if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
            nextDraft.enabled = result.data.enabled;
            nextDraft.merchantId = result.data.merchantId ?? '';
            nextDraft.apiBaseUrl = result.data.apiBaseUrl ?? '';
            nextDraft.recipientField = result.data.recipientField;
            setMeta({
              configured: result.data.configured,
              apiKeyMasked: result.data.apiKeyMasked,
              apiSecretMasked: result.data.apiSecretMasked,
            });
            break;
          }

          case 'apipay': {
            const result = await settingsService.getApiPaySettings();
            if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
            nextDraft.enabled = result.data.enabled;
            nextDraft.apiBaseUrl = result.data.apiBaseUrl ?? '';
            nextDraft.recipientField = result.data.recipientField;
            setMeta({
              configured: result.data.configured,
              apiKeyMasked: result.data.apiKeyMasked,
              webhookUrl: result.data.webhookUrl,
            });
            break;
          }

          case 'aisar': {
            const result = await settingsService.getAisarSettings();
            if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
            nextDraft.enabled = result.data.enabled;
            nextDraft.apiBaseUrl = result.data.apiBaseUrl ?? '';
            setMeta({
              configured: result.data.configured,
              apiKeyMasked: result.data.apiKeyMasked,
              webhookSecretMasked: result.data.webhookSecretMasked,
              webhookUrl: result.data.webhookUrl,
              signatureHeader: result.data.signatureHeader,
              signatureAlgorithm: result.data.signatureAlgorithm,
            });
            break;
          }

          case 'ftelecom': {
            const result = await settingsService.getFtelecomSettings();
            if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
            nextDraft.enabled = result.data.enabled;
            nextDraft.apiBaseUrl = result.data.apiBaseUrl ?? '';
            setMeta({
              configured: result.data.configured,
              crmTokenMasked: result.data.crmTokenMasked,
              webhookUrl: result.data.webhookUrl,
              tokenField: result.data.tokenField,
            });
            break;
          }

          case 'zadarma': {
            const result = await settingsService.getZadarmaSettings();
            if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
            nextDraft.enabled = result.data.enabled;
            nextDraft.apiBaseUrl = result.data.apiBaseUrl ?? '';
            setMeta({
              configured: result.data.configured,
              userKeyMasked: result.data.userKeyMasked,
              userSecretMasked: result.data.userSecretMasked,
              webhookUrl: result.data.webhookUrl,
              signatureHeader: result.data.signatureHeader,
              signatureAlgorithm: result.data.signatureAlgorithm,
              validationMode: result.data.validationMode,
            });
            break;
          }

          case 'google-drive-backup': {
            const result = await settingsService.getGoogleDriveBackupSettings();
            if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
            nextDraft.enabled = result.data.enabled;
            nextDraft.folderId = result.data.folderId ?? '';
            setMeta({
              configured: result.data.configured,
              accessTokenMasked: result.data.accessTokenMasked,
              lastBackupAt: result.data.lastBackupAt,
              oauthConnectUrl: result.data.oauthConnectUrl,
            });
            break;
          }

          case 'yandex-disk-backup': {
            const result = await settingsService.getYandexDiskBackupSettings();
            if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
            nextDraft.enabled = result.data.enabled;
            nextDraft.folderPath = result.data.folderPath ?? '';
            setMeta({
              configured: result.data.configured,
              accessTokenMasked: result.data.accessTokenMasked,
              lastBackupAt: result.data.lastBackupAt,
              oauthConnectUrl: result.data.oauthConnectUrl,
            });
            break;
          }

          default:
            setMeta(null);
            break;
        }

        if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
        applyDraft(nextDraft);
      } catch (error) {
        if (cancelled || requestId !== latestLoadRequestIdRef.current) return;
        setLoadError(getErrorMessage(error, 'Не удалось загрузить настройки интеграции.'));
      } finally {
        if (!cancelled && requestId === latestLoadRequestIdRef.current) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [integrationId, isOpen]);

  const updateDraft = <K extends keyof IntegrationDraft>(key: K, value: IntegrationDraft[K]) => {
    applyDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!integrationId || !isConfigurable) {
      return;
    }

    setSaveError(null);
    setSaving(true);
    latestLoadRequestIdRef.current += 1;

    let savedSnapshot: { enabled: boolean; configured: boolean } | null = null;
    const currentDraft = draftRef.current;

    try {
      switch (integrationId) {
        case 'kpay': {
          const payload: UpdateKpaySettingsRequest = {
            enabled: currentDraft.enabled,
            merchantId: toNullableString(currentDraft.merchantId),
            apiBaseUrl: toNullableString(currentDraft.apiBaseUrl),
            recipientField: currentDraft.recipientField,
            ...(currentDraft.apiKey.trim() ? { apiKey: currentDraft.apiKey.trim() } : {}),
            ...(currentDraft.apiSecret.trim() ? { apiSecret: currentDraft.apiSecret.trim() } : {}),
          };
          const response = await settingsService.updateKpaySettings(payload);
          applyDraft((prev) => ({
            ...prev,
            enabled: response.data.enabled,
            merchantId: response.data.merchantId ?? '',
            apiBaseUrl: response.data.apiBaseUrl ?? '',
            recipientField: response.data.recipientField,
            apiKey: '',
            apiSecret: '',
          }));
          setMeta({
            configured: response.data.configured,
            apiKeyMasked: response.data.apiKeyMasked,
            apiSecretMasked: response.data.apiSecretMasked,
          });
          savedSnapshot = { enabled: response.data.enabled, configured: response.data.configured };
          break;
        }

        case 'apipay': {
          const payload: UpdateApiPaySettingsRequest = {
            enabled: currentDraft.enabled,
            apiBaseUrl: toNullableString(currentDraft.apiBaseUrl),
            recipientField: currentDraft.recipientField,
            ...(currentDraft.apiKey.trim() ? { apiKey: currentDraft.apiKey.trim() } : {}),
            ...(currentDraft.webhookSecret.trim() ? { webhookSecret: currentDraft.webhookSecret.trim() } : {}),
          };
          const response = await settingsService.updateApiPaySettings(payload);
          applyDraft((prev) => ({
            ...prev,
            enabled: response.data.enabled,
            apiBaseUrl: response.data.apiBaseUrl ?? '',
            recipientField: response.data.recipientField,
            apiKey: '',
            webhookSecret: '',
          }));
          setMeta({
            configured: response.data.configured,
            apiKeyMasked: response.data.apiKeyMasked,
            webhookUrl: response.data.webhookUrl,
          });
          savedSnapshot = { enabled: response.data.enabled, configured: response.data.configured };
          break;
        }

        case 'aisar': {
          const payload: UpdateAisarSettingsRequest = {
            enabled: currentDraft.enabled,
            apiBaseUrl: toNullableString(currentDraft.apiBaseUrl),
            ...(currentDraft.apiKey.trim() ? { apiKey: currentDraft.apiKey.trim() } : {}),
            ...(currentDraft.webhookSecret.trim() ? { webhookSecret: currentDraft.webhookSecret.trim() } : {}),
          };
          const response = await settingsService.updateAisarSettings(payload);
          applyDraft((prev) => ({
            ...prev,
            enabled: response.data.enabled,
            apiBaseUrl: response.data.apiBaseUrl ?? '',
            apiKey: '',
            webhookSecret: '',
          }));
          setMeta({
            configured: response.data.configured,
            apiKeyMasked: response.data.apiKeyMasked,
            webhookSecretMasked: response.data.webhookSecretMasked,
            webhookUrl: response.data.webhookUrl,
            signatureHeader: response.data.signatureHeader,
            signatureAlgorithm: response.data.signatureAlgorithm,
          });
          savedSnapshot = { enabled: response.data.enabled, configured: response.data.configured };
          break;
        }

        case 'ftelecom': {
          const payload: UpdateFtelecomSettingsRequest = {
            enabled: currentDraft.enabled,
            apiBaseUrl: toNullableString(currentDraft.apiBaseUrl),
            ...(currentDraft.crmToken.trim() ? { crmToken: currentDraft.crmToken.trim() } : {}),
          };
          const response = await settingsService.updateFtelecomSettings(payload);
          applyDraft((prev) => ({
            ...prev,
            enabled: response.data.enabled,
            apiBaseUrl: response.data.apiBaseUrl ?? '',
            crmToken: '',
          }));
          setMeta({
            configured: response.data.configured,
            crmTokenMasked: response.data.crmTokenMasked,
            webhookUrl: response.data.webhookUrl,
            tokenField: response.data.tokenField,
          });
          savedSnapshot = { enabled: response.data.enabled, configured: response.data.configured };
          break;
        }

        case 'zadarma': {
          const payload: UpdateZadarmaSettingsRequest = {
            enabled: currentDraft.enabled,
            apiBaseUrl: toNullableString(currentDraft.apiBaseUrl),
            ...(currentDraft.userKey.trim() ? { userKey: currentDraft.userKey.trim() } : {}),
            ...(currentDraft.userSecret.trim() ? { userSecret: currentDraft.userSecret.trim() } : {}),
          };
          const response = await settingsService.updateZadarmaSettings(payload);
          applyDraft((prev) => ({
            ...prev,
            enabled: response.data.enabled,
            apiBaseUrl: response.data.apiBaseUrl ?? '',
            userKey: '',
            userSecret: '',
          }));
          setMeta({
            configured: response.data.configured,
            userKeyMasked: response.data.userKeyMasked,
            userSecretMasked: response.data.userSecretMasked,
            webhookUrl: response.data.webhookUrl,
            signatureHeader: response.data.signatureHeader,
            signatureAlgorithm: response.data.signatureAlgorithm,
            validationMode: response.data.validationMode,
          });
          savedSnapshot = { enabled: response.data.enabled, configured: response.data.configured };
          break;
        }

        case 'google-drive-backup': {
          const payload: UpdateGoogleDriveBackupSettingsRequest = {
            enabled: currentDraft.enabled,
            folderId: toNullableString(currentDraft.folderId),
            ...(currentDraft.accessToken.trim() ? { accessToken: currentDraft.accessToken.trim() } : {}),
          };
          const response = await settingsService.updateGoogleDriveBackupSettings(payload);
          applyDraft((prev) => ({
            ...prev,
            enabled: response.data.enabled,
            folderId: response.data.folderId ?? '',
            accessToken: '',
          }));
          setMeta({
            configured: response.data.configured,
            accessTokenMasked: response.data.accessTokenMasked,
            lastBackupAt: response.data.lastBackupAt,
          });
          savedSnapshot = { enabled: response.data.enabled, configured: response.data.configured };
          break;
        }

        case 'yandex-disk-backup': {
          const payload: UpdateYandexDiskBackupSettingsRequest = {
            enabled: currentDraft.enabled,
            folderPath: toNullableString(currentDraft.folderPath),
            ...(currentDraft.accessToken.trim() ? { accessToken: currentDraft.accessToken.trim() } : {}),
          };
          const response = await settingsService.updateYandexDiskBackupSettings(payload);
          applyDraft((prev) => ({
            ...prev,
            enabled: response.data.enabled,
            folderPath: response.data.folderPath ?? '',
            accessToken: '',
          }));
          setMeta({
            configured: response.data.configured,
            accessTokenMasked: response.data.accessTokenMasked,
            lastBackupAt: response.data.lastBackupAt,
          });
          savedSnapshot = { enabled: response.data.enabled, configured: response.data.configured };
          break;
        }

        default:
          break;
      }

      pushToast({ message: 'Настройки интеграции сохранены.', tone: 'success' });
      if (savedSnapshot) {
        onSaved?.({ integrationId, ...savedSnapshot });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(INTEGRATIONS_UPDATED_EVENT));
      }
      onClose();
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Не удалось сохранить настройки интеграции.'));
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!integrationId || !isBackupIntegration) {
      return;
    }

    try {
      const response = integrationId === 'google-drive-backup'
        ? await settingsService.getGoogleDriveOAuthConnectUrl()
        : await settingsService.getYandexDiskOAuthConnectUrl();

      const oauthUrl = response.data;
      if (oauthUrl) {
        window.open(oauthUrl, '_blank', 'noopener,noreferrer');
        pushToast({ message: 'Открываем страницу авторизации...', tone: 'info' });
      } else {
        pushToast({ message: 'OAuth URL не доступен. Попробуйте позже.', tone: 'error' });
      }
    } catch (error) {
      pushToast({ message: 'Не удалось получить ссылку для авторизации.', tone: 'error' });
    }
  };

  const handleRunBackup = async () => {
    if (!integrationId || !isBackupIntegration) {
      return;
    }

    setBackupError(null);
    setRunningBackup(true);

    try {
      const response = integrationId === 'google-drive-backup'
        ? await settingsService.runGoogleDriveBackup()
        : await settingsService.runYandexDiskBackup();

      setLastRunResult(response.data);
      pushToast({ message: 'Резервная копия успешно запущена.', tone: 'success' });
    } catch (error) {
      setBackupError(getErrorMessage(error, 'Не удалось выполнить резервное копирование.'));
    } finally {
      setRunningBackup(false);
    }
  };

  const details = useMemo(() => {
    if (!integrationId) {
      return null;
    }

    switch (integrationId) {
      case 'kpay':
        return (
          <div className="space-y-4">
            {renderEnabledToggle({
              title: 'Статус интеграции',
              enabled: draft.enabled,
              enabledText: 'Интеграция активна',
              disabledText: 'Интеграция отключена',
              onToggle: toggleEnabled,
            })}
            <Input
              label="Merchant ID"
              value={draft.merchantId}
              onChange={(event) => updateDraft('merchantId', event.target.value)}
              placeholder="merchant_id"
            />
            <Input
              label="API Base URL"
              value={draft.apiBaseUrl}
              onChange={(event) => updateDraft('apiBaseUrl', event.target.value)}
              placeholder="https://..."
            />
            <Select
              label="Куда отправлять инвойс"
              value={draft.recipientField}
              onChange={(event) => updateDraft('recipientField', event.target.value as ContactRecipientField)}
            >
              {CONTACT_RECIPIENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {renderSecretField({
              label: 'API Key',
              value: draft.apiKey,
              onChange: (event) => updateDraft('apiKey', event.target.value),
              placeholder: 'Введите новый API key',
              maskedValue: meta?.apiKeyMasked,
              type: 'text',
            })}
            {renderSecretField({
              label: 'API Secret',
              value: draft.apiSecret,
              onChange: (event) => updateDraft('apiSecret', event.target.value),
              placeholder: 'Введите новый API secret',
              maskedValue: meta?.apiSecretMasked,
            })}
          </div>
        );

      case 'apipay':
        return (
          <div className="space-y-4">
            {renderEnabledToggle({
              title: 'Статус интеграции',
              enabled: draft.enabled,
              enabledText: 'Интеграция активна',
              disabledText: 'Интеграция отключена',
              onToggle: toggleEnabled,
            })}
            <Input
              label="API Base URL"
              value={draft.apiBaseUrl}
              onChange={(event) => updateDraft('apiBaseUrl', event.target.value)}
              placeholder="https://..."
            />
            <Select
              label="Куда отправлять инвойс"
              value={draft.recipientField}
              onChange={(event) => updateDraft('recipientField', event.target.value as ContactRecipientField)}
            >
              {CONTACT_RECIPIENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {renderSecretField({
              label: 'API Key',
              value: draft.apiKey,
              onChange: (event) => updateDraft('apiKey', event.target.value),
              placeholder: 'Введите новый API key',
              maskedValue: meta?.apiKeyMasked,
              type: 'text',
            })}
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
              <p>Webhook URL: <span className="font-medium text-[#1f2530]">{meta?.webhookUrl || '—'}</span></p>
            </div>
          </div>
        );

      case 'aisar':
        return (
          <div className="space-y-4">
            {renderEnabledToggle({
              title: 'Статус интеграции',
              enabled: draft.enabled,
              enabledText: 'Интеграция активна',
              disabledText: 'Интеграция отключена',
              onToggle: toggleEnabled,
            })}
            <Input
              label="API Base URL"
              value={draft.apiBaseUrl}
              onChange={(event) => updateDraft('apiBaseUrl', event.target.value)}
              placeholder="https://..."
            />
            {renderSecretField({
              label: 'API Key',
              value: draft.apiKey,
              onChange: (event) => updateDraft('apiKey', event.target.value),
              placeholder: 'Введите новый API key',
              maskedValue: meta?.apiKeyMasked,
              type: 'text',
            })}
            {renderSecretField({
              label: 'Webhook Secret',
              value: draft.webhookSecret,
              onChange: (event) => updateDraft('webhookSecret', event.target.value),
              placeholder: 'Введите новый webhook secret',
              maskedValue: meta?.webhookSecretMasked,
            })}
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
              <p>Webhook URL: <span className="font-medium text-[#1f2530]">{meta?.webhookUrl || '—'}</span></p>
              <p className="mt-1">Header подписи: <span className="font-medium text-[#1f2530]">{meta?.signatureHeader || '—'}</span></p>
              <p className="mt-1">Алгоритм: <span className="font-medium text-[#1f2530]">{meta?.signatureAlgorithm || '—'}</span></p>
            </div>
          </div>
        );

      case 'ftelecom':
        return (
          <div className="space-y-4">
            {renderEnabledToggle({
              title: 'Статус интеграции',
              enabled: draft.enabled,
              enabledText: 'Интеграция активна',
              disabledText: 'Интеграция отключена',
              onToggle: toggleEnabled,
            })}
            <Input
              label="API Base URL"
              value={draft.apiBaseUrl}
              onChange={(event) => updateDraft('apiBaseUrl', event.target.value)}
              placeholder="https://..."
            />
            {renderSecretField({
              label: 'CRM Token',
              value: draft.crmToken,
              onChange: (event) => updateDraft('crmToken', event.target.value),
              placeholder: 'Введите новый crm token',
              maskedValue: meta?.crmTokenMasked,
            })}
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
              <p>Webhook URL: <span className="font-medium text-[#1f2530]">{meta?.webhookUrl || '—'}</span></p>
              <p className="mt-1">Поле токена: <span className="font-medium text-[#1f2530]">{meta?.tokenField || '—'}</span></p>
            </div>
          </div>
        );

      case 'zadarma':
        return (
          <div className="space-y-4">
            {renderEnabledToggle({
              title: 'Статус интеграции',
              enabled: draft.enabled,
              enabledText: 'Интеграция активна',
              disabledText: 'Интеграция отключена',
              onToggle: toggleEnabled,
            })}
            <Input
              label="API Base URL"
              value={draft.apiBaseUrl}
              onChange={(event) => updateDraft('apiBaseUrl', event.target.value)}
              placeholder="https://..."
            />
            {renderSecretField({
              label: 'User Key',
              value: draft.userKey,
              onChange: (event) => updateDraft('userKey', event.target.value),
              placeholder: 'Введите новый user key',
              maskedValue: meta?.userKeyMasked,
            })}
            {renderSecretField({
              label: 'User Secret',
              value: draft.userSecret,
              onChange: (event) => updateDraft('userSecret', event.target.value),
              placeholder: 'Введите новый user secret',
              maskedValue: meta?.userSecretMasked,
            })}
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
              <p>Webhook URL: <span className="font-medium text-[#1f2530]">{meta?.webhookUrl || '—'}</span></p>
              <p className="mt-1">Режим проверки: <span className="font-medium text-[#1f2530]">{meta?.validationMode || '—'}</span></p>
              <p className="mt-1">Header подписи: <span className="font-medium text-[#1f2530]">{meta?.signatureHeader || '—'}</span></p>
              <p className="mt-1">Алгоритм: <span className="font-medium text-[#1f2530]">{meta?.signatureAlgorithm || '—'}</span></p>
            </div>
          </div>
        );

      case 'google-drive-backup':
        return (
          <div className="space-y-4">
            {renderEnabledToggle({
              title: 'Резервное копирование',
              enabled: draft.enabled,
              enabledText: 'Резервное копирование включено',
              disabledText: 'Резервное копирование отключено',
              onToggle: toggleEnabled,
            })}
            <Input
              label="Folder ID"
              value={draft.folderId}
              onChange={(event) => updateDraft('folderId', event.target.value)}
              placeholder="Google Drive folder ID"
            />
            <Button
              variant="secondary"
              onClick={() => void handleOAuthConnect()}
              disabled={loading || saving}
            >
              Подключить Google Drive
            </Button>
            {meta?.accessTokenMasked && (
              <p className="text-xs text-[#8c95a3]">
                Аккаунт подключён. Токен: {meta.accessTokenMasked}
              </p>
            )}
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
              <p>Последний backup: <span className="font-medium text-[#1f2530]">{formatDateTime(meta?.lastBackupAt)}</span></p>
            </div>
          </div>
        );

      case 'yandex-disk-backup':
        return (
          <div className="space-y-4">
            {renderEnabledToggle({
              title: 'Резервное копирование',
              enabled: draft.enabled,
              enabledText: 'Резервное копирование включено',
              disabledText: 'Резервное копирование отключено',
              onToggle: toggleEnabled,
            })}
            <Input
              label="Папка (folderPath)"
              value={draft.folderPath}
              onChange={(event) => updateDraft('folderPath', event.target.value)}
              placeholder="disk:/1edu-backups"
            />
            <Button
              variant="secondary"
              onClick={() => void handleOAuthConnect()}
              disabled={loading || saving}
            >
              Подключить Yandex Disk
            </Button>
            {meta?.accessTokenMasked && (
              <p className="text-xs text-[#8c95a3]">
                Аккаунт подключён. Токен: {meta.accessTokenMasked}
              </p>
            )}
            <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
              <p>Последний backup: <span className="font-medium text-[#1f2530]">{formatDateTime(meta?.lastBackupAt)}</span></p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Для этой интеграции настройка и сохранение параметров пока недоступны.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Интеграция добавлена в каталог, но backend-контракт для этой карточки ещё не подключён.
            </div>
          </div>
        );
    }
  }, [draft, integrationId, meta]);

  const footer = useMemo(() => {
    if (!integrationId) {
      return (
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      );
    }

    if (!isConfigurable) {
      return (
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      );
    }

    return (
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        {isBackupIntegration ? (
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => void handleRunBackup()}
            disabled={runningBackup || loading || saving}
          >
            {runningBackup ? 'Запускаем backup...' : 'Запустить backup'}
          </Button>
        ) : <span />}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving || loading || runningBackup}>
            Отмена
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || loading || runningBackup}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    );
  }, [integrationId, isBackupIntegration, isConfigurable, loading, onClose, runningBackup, saving]);

  if (!integration) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={integration.name}
      footer={footer}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-[#467aff]" />
          </div>
        ) : details}

        {isConfigurable ? (
          <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
            <p>
              Активность: <span className="font-medium text-[#1f2530]">{draft.enabled ? 'Активна' : 'Отключена'}</span>
            </p>
            <p className="mt-1">
              Конфигурация: <span className="font-medium text-[#1f2530]">{meta?.configured ? 'Сконфигурировано' : 'Не настроено'}</span>
            </p>
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}

        {saveError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        ) : null}

        {backupError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {backupError}
          </div>
        ) : null}

        {lastRunResult ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <p className="font-semibold">Backup выполнен успешно</p>
            <p className="mt-1">Файл: {lastRunResult.fileName}</p>
            <p className="mt-1">Путь: {lastRunResult.remotePath || '—'}</p>
            <p className="mt-1">Завершено: {formatDateTime(lastRunResult.completedAt)}</p>
          </div>
        ) : null}

        {!isConfigurable ? (
          <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm text-[#5d6676]">
            Этот модуль работает в режиме просмотра, пока не будет подключён backend endpoint.
          </div>
        ) : null}

        <div className="rounded-xl border border-[#dbe2e8] bg-white px-4 py-3 text-xs text-[#8c95a3]">
          При сохранении пустые поля секретов не перезаписывают текущие значения. Заполните поле только если хотите обновить секрет.
        </div>
      </div>
    </Modal>
  );
};
