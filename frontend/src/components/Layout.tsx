// src/components/Layout.tsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  // Container
} from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import {
  Event as EventIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  Map as MapIcon,
  List as ListIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const Layout: React.FC = () => {
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // メニュー項目の定義
  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Map', icon: <MapIcon />, path: '/spotmap' },
    { text: 'Events', icon: <EventIcon />, path: '/events' },
    { text: 'Spot', icon: <ListIcon />, path: '/list' },
    { text: 'AR Models', icon: <ViewInArIcon />, path: '/ar-models' },
    { text: 'Info', icon: <InfoIcon />, path: '/info' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/setting' },
    { text: 'Admin Invite', icon: <SupervisorAccountIcon />, path: '/invitation' },
  ];

  const drawerContent = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          MyApp
        </Typography>
      </Toolbar>
      <Divider />
      {/* ユーザー情報表示エリア */}
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Logged in as:
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 'bold', wordBreak: 'break-all' }}>
          {user?.email}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'primary.main' }}>
          Role: {role?.toUpperCase()}
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false); // モバイルの場合は閉じる
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        <Divider />
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ヘッダー (AppBar) */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {menuItems.find(i => i.path === location.pathname)?.text || 'Dashboard'}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* サイドナビ (Drawer) */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* モバイル用 (Temporary) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* PC用 (Permanent) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* メインコンテンツエリア */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0, // コンテンツ内の余白はなし
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {/* AppBar分のスペーサー */}
        <Box sx={{ height: '64px' }} />

        {/* 子ルート表示 */}
        <Box sx={{ width: '100%', height: 'calc(100% - 64px)' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
// import React from 'react';
// import { Outlet } from 'react-router-dom';
// import Sidebar from './sidebar';
// import Box from '@mui/material/Box';

// const Layout: React.FC = () => {
//   return (
//     <Box sx={{ display: 'flex', height: '100vh' }}>
//       <Sidebar />
//       {/* メインコンテンツエリア */}
//       <Box
//         component="main"
//         sx={{
//           flexGrow: 1,
//           p: 0,         // 👈 余白なし
//           m: 0,         // 👈 マージンもなし
//           position: 'relative',
//           overflow: 'hidden',
//         }}
//       >
//         <Outlet />
//       </Box>
//     </Box>
//   );
// };

// export default Layout;
