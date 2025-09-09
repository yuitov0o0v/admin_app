import React from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

interface CustomButtonProps {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  type?: 'button' | 'submit' | 'reset';
  sx?: object;
  [key: string]: any;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  label,
  onClick,
  loading = false,
  variant = 'contained',
  color = 'primary',
  ...props
}) => {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      color={color}
      fullWidth
      disabled={loading}
      {...props}
    >
      {loading ? <CircularProgress size={24} /> : label}
    </Button>
  );
};

export default CustomButton;