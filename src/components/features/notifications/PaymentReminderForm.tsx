'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { NOTIFICATION_PROVIDERS, RECIPIENT_TYPES, PAYMENT_REMINDER_TIMINGS, DEFAULT_TEMPLATES, AVAILABLE_VARIABLES } from '@/constants/notification';
import { PaymentReminderSettings } from '@/types/notification';

interface PaymentReminderFormProps {
  settings: PaymentReminderSettings;
  onUpdate: (settings: PaymentReminderSettings) => void;
}

export const PaymentReminderForm = ({ settings, onUpdate }: PaymentReminderFormProps) => {
  const [template, setTemplate] = useState(settings.template || DEFAULT_TEMPLATES['payment-reminder']);

  return (
    <div className="space-y-6">
      {/* Provider */}
      <Select 
        label="Провайдер рассылки"
        value={settings.provider}
        onChange={(e) => onUpdate({ ...settings, provider: e.target.value as any })}
      >
        {NOTIFICATION_PROVIDERS.map(provider => (
          <option key={provider.value} value={provider.value}>
            {provider.label}
          </option>
        ))}
      </Select>

      {/* Template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Шаблон рассылки
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={5}
          className="crm-textarea resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          Вы можете выбрать когда отправлять: за день, в день, после, либо за неделю.
        </p>
      </div>

      {/* Available variables */}
      <div className="crm-surface-soft p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Доступные переменные:</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES['payment-reminder'].map(variable => (
            <span key={variable} className="rounded-lg bg-[#edf3ff] px-3 py-1 text-xs font-medium text-[#315fd0]">
              {variable}
            </span>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-4">
        <Select 
          label="Время отправки"
          value={settings.timing}
          onChange={(e) => onUpdate({ ...settings, timing: e.target.value as any })}
        >
          {PAYMENT_REMINDER_TIMINGS.map(timing => (
            <option key={timing.value} value={timing.value}>
              {timing.label}
            </option>
          ))}
        </Select>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            &nbsp;
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">в</span>
            <Input
              type="time"
              value={settings.sendTime}
              onChange={(e) => onUpdate({ ...settings, sendTime: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Recipients */}
      <Select 
        label="Получатели"
        value={settings.recipients}
        onChange={(e) => onUpdate({ ...settings, recipients: e.target.value as any })}
      >
        {RECIPIENT_TYPES.map(type => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </Select>
    </div>
  );
};
