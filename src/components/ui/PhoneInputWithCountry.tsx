import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿', dialCode: '+7' },
  { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿', dialCode: '+998' },
  { code: 'RU', name: 'Россия', flag: '🇷🇺', dialCode: '+7' },
  { code: 'KG', name: 'Кыргызстан', flag: '🇰🇬', dialCode: '+996' },
  { code: 'TJ', name: 'Таджикистан', flag: '🇹🇯', dialCode: '+992' },
  { code: 'AZ', name: 'Азербайджан', flag: '🇦🇿', dialCode: '+994' },
  { code: 'TR', name: 'Турция', flag: '🇹🇷', dialCode: '+90' },
];

const COUNTRY_BY_CODE = new Map(COUNTRY_OPTIONS.map((option) => [option.code, option]));

function detectCountryByPhone(value: string): CountryOption | null {
  const normalized = value.trim();
  if (!normalized.startsWith('+')) {
    return null;
  }

  const sortedByLongestDialCode = [...COUNTRY_OPTIONS].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sortedByLongestDialCode.find((option) => normalized.startsWith(option.dialCode)) || null;
}

function getNationalPart(value: string, dialCode: string): string {
  const normalized = value.trim();
  const withoutDialCode = normalized.startsWith(dialCode)
    ? normalized.slice(dialCode.length)
    : normalized;
  return withoutDialCode.replace(/\D/g, '');
}

function formatNationalPart(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  const groups: string[] = [];
  let index = 0;
  while (index < digits.length) {
    const remaining = digits.length - index;
    const chunkSize = remaining > 4 ? 3 : 2;
    groups.push(digits.slice(index, index + chunkSize));
    index += chunkSize;
  }

  return groups.join(' ');
}

interface PhoneInputWithCountryProps {
  label?: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export const PhoneInputWithCountry = ({
  label = 'Телефон',
  value,
  onChange,
  placeholder = '700 000 00 00',
  disabled = false,
  error = false,
}: PhoneInputWithCountryProps) => {
  const [manualCountryCode, setManualCountryCode] = useState<string>('KZ');
  const prefixWidth = 76;
  const prefixChevronLeft = prefixWidth - 16;
  const phonePaddingLeft = prefixWidth + 10;

  const detectedCountry = useMemo(() => detectCountryByPhone(value), [value]);
  const selectedCountry = detectedCountry || COUNTRY_BY_CODE.get(manualCountryCode) || COUNTRY_OPTIONS[0];
  const nationalPart = getNationalPart(value, selectedCountry.dialCode);

  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCode = event.target.value;
    const nextCountry = COUNTRY_BY_CODE.get(nextCode) || COUNTRY_OPTIONS[0];

    setManualCountryCode(nextCode);
    onChange(`${nextCountry.dialCode}${nationalPart}`);
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = event.target.value.replace(/\D/g, '');
    onChange(`${selectedCountry.dialCode}${rawDigits}`);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#5d6676]">{label}</label>
      <div className="relative min-w-0">
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[#b9c8dd]"
          style={{ left: prefixWidth }}
        />

        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          disabled={disabled}
          className="absolute left-0 top-0 z-10 h-full appearance-none rounded-l-xl rounded-r-none border border-[#dbe2e8] border-r-0 bg-[#eef4ff] pl-2 pr-5 text-[12px] font-semibold text-[#1d4ed8] outline-none transition-colors hover:bg-[#e5eeff] focus:border-[#467aff]"
          style={{ width: prefixWidth }}
        >
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {option.dialCode}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-[#3568eb]"
          style={{ left: prefixChevronLeft }}
        />

        <input
          type="tel"
          value={formatNationalPart(nationalPart)}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={`crm-input pr-3 ${error ? 'border-red-400 bg-red-50/40 text-red-900 placeholder:text-red-300 focus:border-red-500' : ''}`}
          style={{ paddingLeft: phonePaddingLeft }}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>
    </div>
  );
};
