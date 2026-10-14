import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-[#1f3b45] hover:bg-[#152930] text-white shadow-xs border border-transparent',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-transparent',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
  outline: 'bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-xs border border-transparent',
  dangerOutline: 'bg-transparent hover:bg-red-50 text-red-600 border border-red-200',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent',
};

const SIZES = {
  xs: 'px-2.5 py-1 text-xs rounded-md font-medium',
  sm: 'px-3 py-1.5 text-xs rounded-lg font-semibold',
  md: 'px-4 py-2 text-sm rounded-lg font-semibold',
  lg: 'px-5 py-2.5 text-base rounded-xl font-semibold',
};

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'sm',
  loading = false,
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props
}) => {
  const isSpinnerActive = loading || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isSpinnerActive}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${
        VARIANTS[variant] || VARIANTS.primary
      } ${SIZES[size] || SIZES.sm} ${className}`}
      {...props}
    >
      {isSpinnerActive ? (
        <Loader2
          size={size === 'xs' || size === 'sm' ? 14 : 18}
          className="animate-spin"
        />
      ) : Icon && iconPosition === 'left' ? (
        typeof Icon === 'function' || typeof Icon === 'object' ? (
          <Icon size={size === 'xs' || size === 'sm' ? 14 : 18} />
        ) : (
          <span>{Icon}</span>
        )
      ) : null}

      {children}

      {!isSpinnerActive && Icon && iconPosition === 'right' ? (
        typeof Icon === 'function' || typeof Icon === 'object' ? (
          <Icon size={size === 'xs' || size === 'sm' ? 14 : 18} />
        ) : (
          <span>{Icon}</span>
        )
      ) : null}
    </button>
  );
};

export default Button;
