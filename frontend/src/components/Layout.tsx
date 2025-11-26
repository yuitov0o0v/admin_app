import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';
import Box from '@mui/material/Box';

const Layout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      {/* メインコンテンツエリア */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,         // 👈 余白なし
          m: 0,         // 👈 マージンもなし
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
