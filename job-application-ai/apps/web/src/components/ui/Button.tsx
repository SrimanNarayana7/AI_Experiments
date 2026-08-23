import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60';
  const variants = {
    primary: 'border-transparent bg-primary text-primary-foreground shadow-sm hover:brightness-110',
    secondary: 'border-border bg-secondary text-secondary-foreground hover:bg-muted',
    danger: 'border-transparent bg-destructive text-white hover:brightness-110',
    ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-card-foreground',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Working...' : children}
    </button>
  );
}
