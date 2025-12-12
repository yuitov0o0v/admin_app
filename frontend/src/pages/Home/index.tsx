import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  CardActions,
  Button,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { AddLocationAlt, EditNote, Logout } from '@mui/icons-material';

const Home: React.FC = () => {
  const { user, signOut } = useContext(AuthContext)!;
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err: any) {
      console.error(err.message);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      {/* ヘッダー部分 */}
      <AppBar position="static" elevation={1} sx={{ backgroundColor: 'white', color: 'black' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ダッシュボード
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {user.email}
              </Typography>
              <IconButton onClick={handleSignOut} color="inherit" aria-label="logout">
                <Logout />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ようこそ！
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
          今日は何をしますか？
        </Typography>

        {user ? (
          // ★★★ ここからGridの代わりにBoxとFlexboxでレイアウト ★★★
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4, // Gridのspacing={4}に相当
            }}
          >
            {/* カード1: スポットを登録 */}
            <Box
              sx={{
                width: { xs: '100%', md: 'calc(50% - 16px)' }, // Gridの xs={12} md={6} に相当
              }}
            >
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <AddLocationAlt sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                  <Typography gutterBottom variant="h5" component="h2">
                    新しいスポットを登録
                  </Typography>
                  <Typography color="text.secondary">
                    地図を開いて、新しいスポットの場所や情報を登録します。
                  </Typography>
                </CardContent>
                <CardActions>
                  {/* TODO: ご自身のアプリの「地図登録画面」へのパスに修正してください */}
                  <Button size="small" variant="contained" onClick={() => navigate('/spotmap')}>
                    地図へ移動
                  </Button>
                </CardActions>
              </Card>
            </Box>

            {/* カード2: スポットを管理 */}
            <Box
              sx={{
                width: { xs: '100%', md: 'calc(50% - 16px)' }, // Gridの xs={12} md={6} に相当
              }}
            >
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <EditNote sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
                  <Typography gutterBottom variant="h5" component="h2">
                    登録済みスポットの管理
                  </Typography>
                  <Typography color="text.secondary">
                    これまでに登録したスポットの一覧を確認、編集、削除します。
                  </Typography>
                </CardContent>
                <CardActions>
                  {/* TODO: ご自身のアプリの「一覧編集画面」へのパスに修正してください */}
                  <Button size="small" variant="contained" color="secondary" onClick={() => navigate('/List')}>
                    一覧へ移動
                  </Button>
                </CardActions>
              </Card>
            </Box>
          </Box>
          // ★★★ ここまで ★★★
        ) : (
          <Typography>情報を表示するにはログインしてください。</Typography>
        )}
      </Container>
    </Box>
  );
};

export default Home;