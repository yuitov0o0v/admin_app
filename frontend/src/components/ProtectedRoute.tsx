import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ローディング用のコンポーネント（適宜デザインに合わせて変更してください）
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

/**
 * ログイン必須ルート
 * 未ログインの場合はログイン画面へリダイレクト
 */
export const PrivateRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // ログイン後に元のページに戻れるよう state に from を保存
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Admin専用ルート
 * ログイン必須 かつ Roleがadminであること
 */
export const AdminRoute = () => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // ログインしているが権限がない場合
    // 403 Forbidden ページやホームへ飛ばす
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};