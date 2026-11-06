'use client';

import { useId } from 'react';
import type { PaymentMethod } from '@/lib/api/types';
import { formatKzPhoneInput, normalizeKzPhone } from '@/lib/phone-kz';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Наличные' },
  { value: 'CARD', label: 'Карта' },
  { value: 'TRANSFER', label: 'Перевод' },
  { value: 'OTHER', label: 'Другое' },
];

/** Russian error for the method + transfer phone pair, or null when valid. */
export function paymentMethodError(method: PaymentMethod | '', transferPhone: string): string | null {
  if (!method) return 'Выберите метод оплаты';
  if (method === 'TRANSFER') {
    if (!transferPhone.trim()) return 'Укажите номер телефона, с которого сделан перевод';
    if (!normalizeKzPhone(transferPhone)) return 'Номер для перевода: +7 XXX XXX XX XX';
  }
  return null;
}

interface PaymentMethodFieldProps {
  method: PaymentMethod | '';
  transferPhone: string;
  onMethodChange: (method: PaymentMethod) => void;
  onTransferPhoneChange: (phone: string) => void;
  /** Show validation errors (after the first save attempt). */
  showErrors?: boolean;
  disabled?: boolean;
}

/**
 * «Метод оплаты» as buttons (no dropdown list that could cover other fields).
 * Nothing is chosen by default; «Перевод» adds a required KZ phone field.
 */
export function PaymentMethodField({
  method,
  transferPhone,
  onMethodChange,
  onTransferPhoneChange,
  showErrors = false,
  disabled = false,
}: PaymentMethodFieldProps) {
  const id = useId();
  const error = showErrors ? paymentMethodError(method, transferPhone) : null;
  const methodMissing = showErrors && !method;
  const phoneError = method === 'TRANSFER' ? error : null;

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-invalid={methodMissing || undefined}>
        <span id={`${id}-label`} className="mb-2 block text-sm font-medium text-[#5d6676]">
          Метод оплаты <span className="text-red-500" aria-hidden="true">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {METHODS.map((option) => {
            const selected = method === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onMethodChange(option.value)}
                className={`h-10 rounded-xl border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c7d7ff] disabled:opacity-60 ${
                  selected
                    ? 'border-[#467aff] bg-[#edf3ff] text-[#315fd0]'
                    : methodMissing
                      ? 'border-red-300 bg-white text-[#334155] hover:bg-[#f7f9fb]'
                      : 'border-[#dbe2e8] bg-white text-[#334155] hover:bg-[#f7f9fb]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {methodMissing ? <p role="alert" className="mt-1.5 text-xs text-red-600">Выберите метод оплаты</p> : null}
      </div>

      {method === 'TRANSFER' ? (
        <div>
          <label htmlFor={`${id}-phone`} className="mb-2 block text-sm font-medium text-[#5d6676]">
            Номер для перевода <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+7 XXX XXX XX XX"
            value={transferPhone}
            disabled={disabled}
            aria-invalid={Boolean(phoneError) || undefined}
            onChange={(event) => onTransferPhoneChange(formatKzPhoneInput(event.target.value))}
            className="crm-input"
          />
          {phoneError ? <p role="alert" className="mt-1.5 text-xs text-red-600">{phoneError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
