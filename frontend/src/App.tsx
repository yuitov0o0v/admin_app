import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './context/AuthContext';
import type{ Database } from './types/supabase';

// 型定義から UserProfile の型を取り出す便利テクニック
type UserProfile = Database['public']['Tables']['user_profile']['Row'];

function App() {
  const { user, isAdmin, loading } = useAuth(); // Contextから一発で取得！
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emailInput, setEmailInput] = useState('');

  // ログイン時のみプロフィールを取得
  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    // RLSのおかげで、user_id を指定しなくても「自分のデータ」しか返ってこないはずですが、
    // 明示的に eq('user_id', user.id) を書くのが一般的です。
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single(); // 1件だけ取得

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email: emailInput });
    if (error) alert(error.message);
    else alert('ログインリンクを送信しました');
  };

  const handleLogout = () => supabase.auth.signOut();

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      {!user ? (
        // 未ログイン時の表示
        <form onSubmit={handleLogin}>
          <h1>ログイン</h1>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email"
            required
          />
          <button type="submit">送信</button>
        </form>
      ) : (
        // ログイン時の表示
        <div>
          <h1>ようこそ！</h1>
          <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>基本情報 (Auth)</h2>
            <p>Email: {user.email}</p>
            <p>
              権限: <strong style={{ color: isAdmin ? 'red' : 'green' }}>
                {isAdmin ? '管理者 (Admin)' : '一般ユーザー (User)'}
              </strong>
            </p>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #007bff', borderRadius: '8px' }}>
            <h2>プロフィール情報 (DB: user_profile)</h2>
            {profile ? (
              <>
                <p>ユーザーID: {profile.user_id}</p>
                <p>登録日: {new Date(profile.created_at).toLocaleString()}</p>
                <p>ロール(DB値): {profile.role}</p>
              </>
            ) : (
              <p>プロフィールを読み込み中...</p>
            )}
          </div>

          <button onClick={handleLogout} style={{ marginTop: '20px' }}>ログアウト</button>
          
          {/* Adminだけに表示される秘密のボタン */}
          {isAdmin && (
            <div style={{ marginTop: '20px', padding: '10px', background: '#ffebee' }}>
              <h3>👑 管理者エリア</h3>
              <p>ここにはスポット管理画面へのリンクなどを置きます</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

// import React from 'react';
// import { AuthProvider } from './context/AuthContext';
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { ProtectedRoute } from './components/ProtectedRoute';
// import Layout from './components/Layout'; // 👈 レイアウトコンポーネント
// import Login from './pages/Login';
// import Signup from './pages/Signup';
// import Info from './pages/Info';
// import Setting from './pages/Setting';
// import SpotMap from './pages/SpotMap';
// import List from './pages/ListView';
// import Home from './pages/Home';
// import TestComponent from './tests/AuthSignUp';
// // import Profile from './pages/Profile'; // 例：他の保護されたページ

// // MUIのテーマを作成
// const theme = createTheme();


// const App: React.FC = () => {
//   return (
//     <ThemeProvider theme={theme}>
//       <AuthProvider>
//         <Router>
//           <Routes>
//             {/* --- 公開ルート --- */}
//             {/* このルートにはサイドバーのレイアウトは適用されません */}
//             <Route path="/login" element={<Login />} />
//             <Route path="/signup" element={<Signup />} />
//             <Route path="/test" element={<TestComponent />} />

//             {/* --- 保護されたルート --- */}
//             {/* この親ルートが、配下の子ルートをすべて保護し、レイアウトを適用します */}
//             <Route
//               element={
//                 <ProtectedRoute>
//                   <Layout />
//                 </ProtectedRoute>
//               }
//             >
//               {/* ここにネストされたルートはすべてログインが必要になり、サイドバーが表示されます */}
//               <Route path="/" element={<Home />} />
//               <Route path="/SpotMap" element={<SpotMap />} />
//               <Route path="/List" element={<List />} />
//               <Route path="/info" element={<Info />} />
//               <Route path="/setting" element={<Setting />} />
//             </Route>
//           </Routes>
//         </Router>
//       </AuthProvider>
//     </ThemeProvider>
//   );
// };

// export default App;