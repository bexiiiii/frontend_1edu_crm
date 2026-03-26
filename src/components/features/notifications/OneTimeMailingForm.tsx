'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { NOTIFICATION_PROVIDERS, RECIPIENT_TYPES, DEFAULT_TEMPLATES } from '@/constants/notification';
import { OneTimeMailingSettings } from '@/types/notification';

interface OneTimeMailingFormProps {
  settings: OneTimeMailingSettings;
  onUpdate: (settings: OneTimeMailingSettings) => void;
}

export const OneTimeMailingForm = ({ settings, onUpdate }: OneTimeMailingFormProps) => {
  const [template, setTemplate] = useState(settings.template || DEFAULT_TEMPLATES['one-time']);

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
          rows={12}
          className="crm-textarea resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          Создайте и отправьте разовую рассылку по выбранному провайдеру и списку получателей.
        </p>
      </div>

      {/* Available variables */}
      <div className="crm-surface-soft p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Доступные переменные:</p>
        <p className="text-xs text-gray-500">Нет доступных переменных для разовой рассылки</p>
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

      {/* Limitations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ограничение по количеству
        </label>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Пропустить первых</span>
            <Input
              type="number"
              value={settings.skipFirst}
              onChange={(e) => onUpdate({ ...settings, skipFirst: parseInt(e.target.value) || 0 })}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">и отправить максимум</span>
            <Input
              type="number"
              placeholder="∞"
              value={settings.maxSend || ''}
              onChange={(e) => onUpdate({ ...settings, maxSend: e.target.value ? parseInt(e.target.value) : null })}
              className="w-24"
            />
            <span className="text-sm text-gray-600">сообщений</span>
          </div>
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Вложение (опционально)
        </label>
        <input
          type="file"
          className="text-sm text-gray-600"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button className="flex-1">
          Отправить рассылку
        </Button>
        <Button variant="outline">
          Тест в WhatsApp
        </Button>
      </div>
    </div>
  );
};
