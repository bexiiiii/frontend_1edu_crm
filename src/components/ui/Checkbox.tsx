interface CheckboxProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  helperText?: string;
}

export const Checkbox = ({ label, checked, onChange, helperText }: CheckboxProps) => {
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="h-4 w-4 rounded border-[#cfd8e1] text-[#25c4b8] focus:ring-[#25c4b8]"
        />
        <span className="text-sm font-medium text-[#516073]">{label}</span>
      </label>
      {helperText && (
        <p className="ml-6 mt-1 text-xs text-[#8c95a3]">{helperText}</p>
      )}
    </div>
  );
};
