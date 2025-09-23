import React from 'react';
import { Outlet, useLocation } from 'react-router-dom'; // 👈 useLocation をインポート
import Sidebar from './Sidebar';
import Box from '@mui/material/Box';

const Layout: React.FC = () => {
  const location = useLocation();
  // 👇 地図ページのパスかどうかを判定
  const isMapPage = location.pathname === '/spotmap';

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}> {/* 👈 高さを画面全体に */}
      <Sidebar />
      {/* メインコンテンツエリア */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // 👇 isMapPage に応じてスタイルを切り替え
          p: isMapPage ? 0 : 3,
          mt: isMapPage ? 0 : { xs: 7, sm: 8 },
          position: 'relative', // 👈 子要素を絶対配置する基準にする
          overflow: 'hidden', // 👈 地図がはみ出ないように
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;