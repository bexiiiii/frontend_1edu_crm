'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { NOTIFICATION_PROVIDERS, RECIPIENT_TYPES, DEFAULT_TEMPLATES, AVAILABLE_VARIABLES } from '@/constants/notification';
import { BirthdayGreetingSettings } from '@/types/notification';

interface BirthdayGreetingFormProps {
  settings: BirthdayGreetingSettings;
  onUpdate: (settings: BirthdayGreetingSettings) => void;
}

export const BirthdayGreetingForm = ({ settings, onUpdate }: BirthdayGreetingFormProps) => {
  const [template, setTemplate] = useState(settings.template || DEFAULT_TEMPLATES['birthday']);

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
          rows={6}
          className="crm-textarea resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          Данное сообщение будет отправляться всем клиентам, которые имеются в вашей базе данных. Даже тем, кто уже не посещает Ваш центр.
        </p>
      </div>

      {/* Available variables */}
      <div className="crm-surface-soft p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Доступные переменные:</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES['birthday'].map(variable => (
            <span key={variable} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium">
              {variable}
            </span>
          ))}
        </div>
      </div>

      {/* Time */}
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
