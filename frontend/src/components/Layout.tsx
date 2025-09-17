import React from 'react';
import { Outlet } from 'react-router-dom'; // 👈 Outletをインポート
import Sidebar from './Sidebar'; // サイドバーコンポーネント
import Box from '@mui/material/Box';

const Layout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      {/* メインコンテンツエリア */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, mt: { xs: 7, sm: 8 } }} // ヘッダーがある場合などを考慮したマージン
      >
        {/* 👇 ここにURLに応じたページコンポーネントが表示される */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;