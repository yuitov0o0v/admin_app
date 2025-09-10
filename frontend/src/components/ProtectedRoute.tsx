import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  // 1. 認証状態を読み込み中の場合
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center', // 水平方向中央
          alignItems: 'center',     // 垂直方向中央
          height: '100vh',         // 画面全体の高さ
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // 2. ユーザーが存在しない場合
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. ユーザーが存在する場合 (変更なし)
  return children;
};