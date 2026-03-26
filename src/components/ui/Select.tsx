import { ReactNode } from 'react';

interface SelectProps {
  label?: string;
  children: ReactNode;
  helperText?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
}

export const Select = ({ label, children, helperText, value, onChange, className = '', disabled = false }: SelectProps) => {
  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[#5d6676]">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="crm-select"
      >
        {children}
      </select>
      {helperText && (
        <p className="mt-1.5 text-xs text-[#8c95a3]">{helperText}</p>
      )}
    </div>
  );
};
