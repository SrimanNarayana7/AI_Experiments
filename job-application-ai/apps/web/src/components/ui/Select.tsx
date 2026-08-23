import React from 'react';

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      {...props}
    />
  );
}
