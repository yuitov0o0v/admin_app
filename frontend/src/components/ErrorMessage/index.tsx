import React from 'react';
import Alert from '@mui/material/Alert';

interface ErrorMessageProps {
  message: string | null;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;
  return (
    <Alert severity="error" sx={{ mt: 2 }}>
      {message}
    </Alert>
  );
};

export default ErrorMessage;