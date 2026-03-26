'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { NOTIFICATION_PROVIDERS, RECIPIENT_TYPES, DEFAULT_TEMPLATES, AVAILABLE_VARIABLES } from '@/constants/notification';
import { NoSubscriptionSettings } from '@/types/notification';

interface NoSubscriptionFormProps {
  settings: NoSubscriptionSettings;
  onUpdate: (settings: NoSubscriptionSettings) => void;
}

export const NoSubscriptionForm = ({ settings, onUpdate }: NoSubscriptionFormProps) => {
  const [template, setTemplate] = useState(settings.template || DEFAULT_TEMPLATES['no-subscription']);

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
          Сообщение отправляется 1 раз клиенту, который записан на занятие, но без активного абонемента.
        </p>
      </div>

      {/* Available variables */}
      <div className="crm-surface-soft p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Доступные переменные:</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES['no-subscription'].map(variable => (
            <span key={variable} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium">
              {variable}
            </span>
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Время отправки
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            &nbsp;
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">за</span>
            <Input
              type="number"
              value={settings.daysBeforeClass}
              onChange={(e) => onUpdate({ ...settings, daysBeforeClass: parseInt(e.target.value) || 3 })}
              className="w-20"
            />
            <span className="text-sm text-gray-600">дней</span>
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
