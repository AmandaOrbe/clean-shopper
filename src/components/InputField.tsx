import React from 'react';

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  type?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

export default function InputField({
  label,
  value,
  onChange,
  id,
  type = 'text',
  placeholder,
  helperText,
  error,
  disabled = false,
}: InputFieldProps) {
  const inputClasses = [
    'w-full bg-neutral-100 border rounded-md',
    'px-space-md py-space-sm',
    'text-body text-neutral-900',
    'placeholder:text-neutral-400',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2',
    error
      ? 'border-error focus:border-error focus:ring-error/20'
      : 'border-neutral-200 focus:border-primary focus:ring-primary/20',
    disabled ? 'bg-neutral-200 opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="text-h4 text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
      />
      {(error || helperText) && (
        <span className={`text-small ${error ? 'text-error' : 'text-neutral-600'}`}>
          {error ?? helperText}
        </span>
      )}
    </div>
  );
}
