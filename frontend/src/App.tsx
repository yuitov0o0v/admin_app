import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// 認証コンテキスト
import { AuthProvider } from './context/AuthContext';

// コンポーネント
import { AdminRoute, PrivateRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';

// ページ (まだ作成していないものはプレースホルダーとしてインポートを想定)
import Login from './pages/logIn';
import Signup from './pages/signup';
import Home from './pages/home';
import SpotMap from './pages/spotmap';
import EventView from './pages/eventview';
import ListView from './pages/listview'; // "List" は予約語と競合しやすいため ListView 推奨
import Info from './pages/info';
import Invitation from './pages/invitation';
import Setting from './pages/setting';

// MUIテーマ設定
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // アプリのメインカラー
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5', // 全体の背景色（薄いグレー）
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      {/* ブラウザ間のスタイル差分をリセットし、基本的なMUIスタイルを適用 */}
      <CssBaseline />
      
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* --- Public Routes (未ログインでアクセス可能) --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* ルートへの直接アクセスで未ログインならLoginへ (PrivateRouteが処理しますが明示的に書いてもOK) */}
            
            {/* --- Protected Routes (ログイン必須) --- */}
            {/* 1. まず PrivateRoute で認証チェック */}
            <Route element={<PrivateRoute />}>
              {/* 2. 認証OKなら Layout を適用 (ヘッダー・サイドバー表示) */}
              <Route element={<Layout />}>

            
                <Route element={<AdminRoute />}>
                {/* ダッシュボード */}
                  <Route path="/" element={<Home />} />

                {/* 機能ページ */}
                  <Route path="/spotmap" element={<SpotMap />} />
                  <Route path="/events" element={<EventView />} />
                  <Route path="/list" element={<ListView />} />
                  <Route path="/info" element={<Info />} />
                  <Route path="/setting" element={<Setting />} />
                  <Route path="/invitation" element={<Invitation />} />
                </Route>
                
              </Route>
            </Route>

            {/* 定義されていないパスへのアクセスはホーム（またはログイン）へリダイレクト */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;