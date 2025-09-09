import type React from 'react';
import type { ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';

interface CustomTextFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  [key: string]: any; // その他のMUI props
}

const CustomTextField: React.FC<CustomTextFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  helperText,
  ...props
}) => {
  return (
    <TextField
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      error={!!error}
      helperText={helperText}
      fullWidth
      margin="normal"
      variant="outlined"
      {...props}
    />
  );
};

export default CustomTextField;