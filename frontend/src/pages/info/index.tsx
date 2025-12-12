import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button
} from '@mui/material';
import {
  Map as MapIcon,
  ViewInAr as ArIcon,
  CheckCircle as CheckIcon,
  EmojiEvents as TrophyIcon,
  Info as InfoIcon,
  DirectionsWalk as WalkIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Info: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
          About This App
        </Typography>
        <Typography variant="h6" color="text.secondary">
          AR技術を活用した新しいスポット探索・イベント参加プラットフォーム
        </Typography>
      </Box>

      {/* 機能紹介セクション */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12 , md: 4}}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', textAlign: 'center' }}>
            <MapIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom fontWeight="bold">
              スポット探索
            </Typography>
            <Typography variant="body2" color="text.secondary">
              地図上で周辺の観光名所や隠れたスポットを発見。
              現在地周辺の情報をリアルタイムに確認できます。
            </Typography>
          </Paper>
        </Grid>
         <Grid size={{ xs: 12 , md: 4}}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', textAlign: 'center' }}>
            <ArIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom fontWeight="bold">
              AR体験
            </Typography>
            <Typography variant="body2" color="text.secondary">
              特定のスポットに近づくと、AR（拡張現実）コンテンツが出現。
              スマホのカメラを通して新しい景色を楽しめます。
            </Typography>
          </Paper>
        </Grid>
          <Grid size={{ xs: 12 , md: 4}}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', textAlign: 'center' }}>
            <TrophyIcon sx={{ fontSize: 60, color: '#fbc02d', mb: 2 }} />
            <Typography variant="h6" gutterBottom fontWeight="bold">
              イベント & ラリー
            </Typography>
            <Typography variant="body2" color="text.secondary">
              期間限定のスタンプラリーやイベントに参加。
              スポットを巡ってコンプリートを目指しましょう。
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 使い方セクション */}
      <Paper elevation={1} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
          How to Use
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <List>
          <ListItem>
            <ListItemIcon>
              <WalkIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="1. スポットを探す" 
              secondary="「Map」または「List」画面から、行きたい場所を探します。" 
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <WalkIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="2. 現地に行く" 
              secondary="実際にその場所へ移動します。位置情報を使ってチェックイン判定が行われます。" 
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="3. チェックイン & AR体験" 
              secondary="スポットの範囲内に入ったら詳細画面を開いてみましょう。ARコンテンツを楽しんだり、訪問記録を残せます。" 
            />
          </ListItem>
        </List>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button variant="contained" size="large" onClick={() => navigate('/SpotMap')}>
            マップへ移動する
          </Button>
        </Box>
      </Paper>

      {/* フッター情報 */}
      <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
        <Typography variant="body2">
          App Version 1.0.0
        </Typography>
        <Typography variant="body2">
          &copy; 2024 Your Company Name. All rights reserved.
        </Typography>
      </Box>
    </Container>
  );
};

export default Info;