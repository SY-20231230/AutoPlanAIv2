import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // You can add custom props here if needed, e.g.,
  // variant?: 'primary' | 'secondary' | 'danger';
  // size?: 'small' | 'medium' | 'large';
}

const Button: React.FC<ButtonProps> = ({ children, className = '', ...rest }) => {
  return (
    <button
      className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 ease-in-out
                 bg-blue-500 text-white hover:bg-blue-600
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                 disabled:opacity-50 disabled:cursor-not-allowed
                 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;