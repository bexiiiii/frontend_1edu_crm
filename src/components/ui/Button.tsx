import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  icon?: LucideIcon;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  icon: Icon,
  type = 'button',
  size = 'md',
  className = '',
  disabled = false,
}: ButtonProps) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
  };
  const variants = {
    primary: 'bg-[#25c4b8] text-white hover:bg-[#1eb3a8] shadow-[0_1px_2px_rgba(14,23,38,0.08)]',
    secondary: 'border border-[#dbe2e8] bg-white text-[#3d4756] hover:bg-[#f4f7f9]',
    outline: 'border border-[#dbe2e8] bg-white text-[#3d4756] hover:bg-[#f4f7f9]',
    ghost: 'bg-[#edf2f5] text-[#4c5665] hover:bg-[#e3eaef]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};
