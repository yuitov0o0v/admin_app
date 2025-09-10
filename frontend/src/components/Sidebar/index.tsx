import React, { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext'; // useAuthをインポート (AuthContextは不要に)
import { useNavigate, Link } from 'react-router-dom';
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
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 240;

// メニュー項目の型を定義して、コードの安全性を高める
interface MenuItemData {
  text: string;
  icon: React.ReactElement;
  path?: string; // 画面遷移用のパス（オプショナル）
  action?: () => void; // クリック時の処理（オプショナル）
}

const Sidebar: React.FC = () => {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = useCallback(async () => {
        try {
          await signOut();
          navigate('/login');
        } catch (err: any) {
          console.error('Failed to sign out:', err.message);
        }
      }, [signOut, navigate]);


  // メニューデータを定義
  const menuItems: MenuItemData[] = [
    { text: 'ホーム', icon: <HomeIcon />, path: '/' },
    { text: 'お知らせ', icon: <InfoIcon />, path: '/info' },
  ];

  const secondaryMenuItems: MenuItemData[] = [
    { text: '設定', icon: <SettingsIcon />, path: '/settings' },
    // ログアウト項目には `path` の代わりに `action` を指定
    { text: 'ログアウト', icon: <LogoutIcon />, action: handleSignOut },
  ];

  // リスト項目をレンダリングする共通のロジック
  const renderMenuItems = (items: MenuItemData[]) =>
    items.map((item) => (
      <ListItem key={item.text} disablePadding>
        <ListItemButton
          // pathがあればLinkとして動作させ、なければactionを実行
          component={item.path ? Link : 'div'}
          to={item.path}
          onClick={item.action}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItemButton>
      </ListItem>
    ));

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: '#f5f5f5',
        },
      }}
    >
      <Toolbar />
      <List>{renderMenuItems(menuItems)}</List>
      <Divider />
      <List>{renderMenuItems(secondaryMenuItems)}</List>
    </Drawer>
  );
};

export default Sidebar;