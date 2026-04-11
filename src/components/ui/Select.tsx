import { ReactNode } from 'react';

interface SelectProps {
  label?: string;
  labelSuffix?: string;
  children: ReactNode;
  helperText?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
  selectClassName?: string;
  error?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
}

export const Select = ({
  label,
  labelSuffix,
  children,
  helperText,
  value,
  onChange,
  className = '',
  disabled = false,
  selectClassName = '',
  error = false,
  name,
  id,
  required,
}: SelectProps) => {
  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[#5d6676]">
          {label}
          {labelSuffix ? <span className="ml-1 text-[#8c95a3]">{labelSuffix}</span> : null}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        name={name}
        id={id}
        required={required}
        aria-invalid={error || undefined}
        className={`crm-select ${error ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500' : ''} ${selectClassName}`.trim()}
      >
        {children}
      </select>
      {helperText && (
        <p className="mt-1.5 text-xs text-[#8c95a3]">{helperText}</p>
      )}
    </div>
  );
};
