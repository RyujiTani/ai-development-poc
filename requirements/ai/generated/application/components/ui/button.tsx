import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, loading, className = '', disabled, ...props }) => {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full flex items-center justify-center rounded-lg bg-indigo-600 px-4 h-12 text-white font-semibold shadow hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150 ease-in-out text-base ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
};