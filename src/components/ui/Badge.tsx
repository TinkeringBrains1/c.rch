import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'info' | 'warning' | 'default';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-[#10B981] text-white',
    info: 'bg-[#2563EB] text-white',
    warning: 'bg-[#F59E0B] text-white',
    default: 'bg-gray-200 text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border-[2px] border-black ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Made with Bob
