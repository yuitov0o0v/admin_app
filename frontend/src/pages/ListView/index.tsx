import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Supabaseクライアントのパスは適宜調整してください
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  TextField,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

// --- 型定義 ---
interface Spot {
  id: number;
  name: string;
  description: string;
  subtitle: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  image_url: string | null;
  ar_model_id: number | null;
  category: string | null;
  pin_color: string | null;
  radius: number | null;
}

interface ARModel {
  id: number;
  name: string;
}

// --- 定数定義 ---
const CATEGORIES = ['観光', 'グルメ', 'イベント', 'アート', 'その他'];
const PIN_COLORS = [
  { name: '赤', value: '#FF0000' },
  { name: '青', value: '#0000FF' },
  { name: '緑', value: '#008000' },
  { name: '黄', value: '#FFFF00' },
  { name: '紫', value: '#800080' },
  { name: '黒', value: '#000000' },
  { name: '白', value: '#FFFFFF' },
  { name: '灰', value: '#808080' },
  { name: '茶', value: '#A52A2A' },
  { name: 'コーラルピンク', value: '#F8AFA6' },
  { name: 'マスタードイエロー', value: '#DDA448' },
  { name: 'セージグリーン', value: '#9DC183' },
  { name: 'ダスティブルー', value: '#6A89A4' },
  { name: 'トープ', value: '#483C32' },
];


const SpotListPage: React.FC = () => {
  // --- State管理 ---
  const [spots, setSpots] = useState<Spot[]>([]);
  const [arModels, setArModels] = useState<ARModel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);


  // --- データ取得 ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [spotsResponse, arModelsResponse] = await Promise.all([
      supabase.from('spots').select('*').order('id', { ascending: true }),
      supabase.from('ar_models').select('id, name')
    ]);

    if (spotsResponse.error) {
      console.error('Error fetching spots:', spotsResponse.error);
      setSnackbar({ open: true, message: 'スポットデータの取得に失敗しました。', severity: 'error' });
    } else {
      setSpots(spotsResponse.data || []);
    }

    if (arModelsResponse.error) {
        console.error('Error fetching AR models:', arModelsResponse.error);
        setSnackbar({ open: true, message: 'ARモデルの取得に失敗しました。', severity: 'error' });
    } else {
        setArModels(arModelsResponse.data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // --- 編集関連の処理 ---
  const handleOpenEditDialog = (spot: Spot) => {
    setEditingSpot({ ...spot });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingSpot(null);
  };

  const handleEditFormChange = (field: keyof Spot, value: any) => {
    setEditingSpot(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleUpdateSpot = async () => {
    if (!editingSpot) return;
    const { id, ...updateData } = editingSpot;
    const { error } = await supabase.from('spots').update(updateData).eq('id', id);

    if (error) {
      setSnackbar({ open: true, message: `更新に失敗しました: ${error.message}`, severity: 'error' });
    } else {
      setSnackbar({ open: true, message: '更新が完了しました。', severity: 'success' });
      handleCloseEditDialog();
      fetchData();
    }
  };


  // --- 削除関連の処理 ---
  const handleOpenDeleteDialog = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleDeleteSpot = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('spots').delete().eq('id', deletingId);

    if (error) {
      setSnackbar({ open: true, message: `削除に失敗しました: ${error.message}`, severity: 'error' });
    } else {
      setSnackbar({ open: true, message: '削除が完了しました。', severity: 'success' });
      handleCloseDeleteDialog();
      fetchData();
    }
  };

  
  // --- レンダリング ---
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>スポット一覧・編集</Typography>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>スポット名</TableCell>
              <TableCell>カテゴリ</TableCell>
              <TableCell>住所</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {spots.map((spot) => (
              <TableRow key={spot.id}>
                <TableCell>{spot.id}</TableCell>
                <TableCell>{spot.name}</TableCell>
                <TableCell>{spot.category || '未設定'}</TableCell>
                <TableCell>{spot.address || '未設定'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenEditDialog(spot)}><Edit /></IconButton>
                  <IconButton onClick={() => handleOpenDeleteDialog(spot.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 編集用ダイアログ */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>スポットの編集 (ID: {editingSpot?.id})</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              mt: 1,
            }}
          >
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField label="スポット名" fullWidth value={editingSpot?.name || ''} onChange={(e) => handleEditFormChange('name', e.target.value)} />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField label="サブタイトル" fullWidth value={editingSpot?.subtitle || ''} onChange={(e) => handleEditFormChange('subtitle', e.target.value)} />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField label="住所" fullWidth value={editingSpot?.address || ''} onChange={(e) => handleEditFormChange('address', e.target.value)} />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField label="緯度 (Latitude)" type="number" fullWidth value={editingSpot?.latitude || ''} onChange={(e) => handleEditFormChange('latitude', parseFloat(e.target.value))} />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField label="経度 (Longitude)" type="number" fullWidth value={editingSpot?.longitude || ''} onChange={(e) => handleEditFormChange('longitude', parseFloat(e.target.value))} />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField label="説明" fullWidth multiline rows={4} value={editingSpot?.description || ''} onChange={(e) => handleEditFormChange('description', e.target.value)} />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <FormControl fullWidth>
                <InputLabel>カテゴリー</InputLabel>
                <Select value={editingSpot?.category || ''} label="カテゴリー" onChange={(e) => handleEditFormChange('category', e.target.value)}>
                  {CATEGORIES.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
             <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <FormControl fullWidth>
                <InputLabel>ピンの色</InputLabel>
                <Select value={editingSpot?.pin_color || ''} label="ピンの色" onChange={(e) => handleEditFormChange('pin_color', e.target.value)}>
                  {PIN_COLORS.map(color => <MenuItem key={color.value} value={color.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 16, height: 16, backgroundColor: color.value, borderRadius: '50%', border: '1px solid #ccc' }} />
                      {color.name}
                    </Box>
                  </MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <FormControl fullWidth>
                <InputLabel>ARモデル</InputLabel>
                <Select
                  // ★★★ ここが修正箇所 ★★★
                  // number型のIDをtoString()でstring型に変換して渡す
                  value={editingSpot?.ar_model_id?.toString() || ''}
                  label="ARモデル"
                  onChange={(e) => handleEditFormChange('ar_model_id', e.target.value === '' ? null : Number(e.target.value))}
                >
                   <MenuItem value=""><em>選択しない</em></MenuItem>
                  {arModels.map(model => <MenuItem key={model.id} value={model.id}>{model.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField label="判定範囲 (m)" type="number" fullWidth value={editingSpot?.radius || ''} onChange={(e) => handleEditFormChange('radius', Number(e.target.value))} />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField label="イメージ画像URL" fullWidth value={editingSpot?.image_url || ''} onChange={(e) => handleEditFormChange('image_url', e.target.value)} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>キャンセル</Button>
          <Button onClick={handleUpdateSpot} variant="contained">更新する</Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent><DialogContentText>本当にこのスポットを削除しますか？この操作は元に戻せません。</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
          <Button onClick={handleDeleteSpot} color="error">削除する</Button>
        </DialogActions>
      </Dialog>

      {/* 通知用Snackbar */}
      <Snackbar open={snackbar?.open} autoHideDuration={6000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity} sx={{ width: '100%' }}>{snackbar?.message}</Alert>
      </Snackbar>

    </Container>
  );
};

export default SpotListPage;