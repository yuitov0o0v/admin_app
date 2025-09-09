import React from 'react';
import {
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';

// サイドバーの幅
const drawerWidth = 240;

// メニュー項目のデータ
// アイコンやテキスト、リンク先をここで定義
const menuItems = [
  { text: 'ホーム', icon: <HomeIcon />, path: '/' },
  { text: 'お知らせ', icon: <InfoIcon />, path: '/info' },
];

const secondaryMenuItems = [
  { text: '設定', icon: <SettingsIcon />, path: '/settings' },
];


const Sidebar = () => {
  return (
    <Drawer
      variant="permanent" // サイドバーを常に表示する
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: '#f5f5f5', // サイドバーの背景色
        },
      }}
    >
      {/* AppBarの下にコンテンツが隠れないようにするためのスペーサー */}
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          // react-router-domなどを使う場合は、ListItemButtonをLinkコンポーネントでラップします
          // 例: <ListItemButton component={Link} to={item.path}>
          <ListItem key={item.text} disablePadding>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider /> {/* 区切り線 */}
      <List>
        {secondaryMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;