interface InputProps {
  label?: string;
  type?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const Input = ({
  label,
  type = 'text',
  value,
  defaultValue,
  onChange,
  className = '',
  placeholder,
  disabled = false,
}: InputProps) => {
  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[#5d6676]">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="crm-input"
      />
    </div>
  );
};
