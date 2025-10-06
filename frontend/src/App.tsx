import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout'; // 👈 レイアウトコンポーネント
import Login from './pages/Login';
import Signup from './pages/Signup';
import Info from './pages/Info';
import Setting from './pages/Setting';
import SpotMap from './pages/SpotMap';
import List from './pages/ListView';
import Home from './pages/Home';
import TestComponent from './tests/AuthSignUp';
// import Profile from './pages/Profile'; // 例：他の保護されたページ

// MUIのテーマを作成
const theme = createTheme();


const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* --- 公開ルート --- */}
            {/* このルートにはサイドバーのレイアウトは適用されません */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/test" element={<TestComponent />} />

            {/* --- 保護されたルート --- */}
            {/* この親ルートが、配下の子ルートをすべて保護し、レイアウトを適用します */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* ここにネストされたルートはすべてログインが必要になり、サイドバーが表示されます */}
              <Route path="/" element={<Home />} />
              <Route path="/SpotMap" element={<SpotMap />} />
              <Route path="/List" element={<List />} />
              <Route path="/info" element={<Info />} />
              <Route path="/setting" element={<Setting />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;