import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor={props.id}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 text-base focus:outline-none transition duration-150 ease-in-out ${
            error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';