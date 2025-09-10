import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';

// MUIのテーマを作成
const theme = createTheme();

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* --- 公開ルート --- */}
            {/* ログインページへのパスを定義します */}
            <Route path="/login" element={<Login />} />

            {/* --- 保護されたルート --- */}
            {/* アプリケーションのホームページ（ルートパス "/"）を定義します。 */}
            {/* ProtectedRouteが未ログインのユーザーを自動で "/login" にリダイレクトします。 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;