import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary hover:bg-primary-container/90 border-transparent',
  secondary: 'bg-transparent text-on-surface border-outline-variant hover:border-outline hover:bg-surface-container',
  ghost: 'bg-transparent text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-high',
  danger: 'bg-error/10 text-error border-error/20 hover:bg-error/20',
};

const SIZES: Record<string, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase rounded border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
