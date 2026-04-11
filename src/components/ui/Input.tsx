interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue' | 'type'> {
  label?: string;
  labelSuffix?: string;
  type?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  inputClassName?: string;
  error?: boolean;
}

export const Input = ({
  label,
  labelSuffix,
  type = 'text',
  value,
  defaultValue,
  onChange,
  className = '',
  inputClassName = '',
  placeholder,
  disabled = false,
  error = false,
  ...rest
}: InputProps) => {
  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[#5d6676]">
          {label}
          {labelSuffix ? <span className="ml-1 text-[#8c95a3]">{labelSuffix}</span> : null}
        </label>
      )}
      <input
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={`crm-input ${error ? 'border-red-400 bg-red-50/40 text-red-900 placeholder:text-red-300 focus:border-red-500' : ''} ${inputClassName}`.trim()}
        {...rest}
      />
    </div>
  );
};
