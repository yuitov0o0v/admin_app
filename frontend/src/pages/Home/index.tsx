import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CustomButton from '../../components/Button';
import { useNavigate } from 'react-router-dom'; // ログアウト用リダイレクト

const Home: React.FC = () => {
  const { user, signOut } = useContext(AuthContext)!;
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login'); // ログアウト後ログインへリダイレクト
    } catch (err: any) {
      console.error(err.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8 }}>
      <Box
        component="main" // メインコンテンツであることを示すためにmain要素としてレンダリング
        sx={{ flexGrow: 1, p: 3, mt: 8 }} // flexGrow: 1で残りのスペースを全て使い、paddingで見やすくする
      >
        <Typography variant="h4" component="h1" gutterBottom>
        ホーム
       </Typography>
      {user ? (
        <>
          <Typography>ようこそ、{user.email}さん！</Typography>
          <CustomButton label="ログアウト" onClick={handleSignOut} sx={{ mt: 2 }} />
        </>
      ) : (
        <Typography>ログインしてください。</Typography>
      )}
      </Box>
    </Box>
  );
};

export default Home;