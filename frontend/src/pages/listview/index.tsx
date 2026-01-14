import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  // Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  Place as PlaceIcon,
  ViewInAr as ViewInArIcon,
  ImageNotSupported as ImageNotSupportedIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Radar as RadarIcon,
  ColorLens as ColorLensIcon
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { spotsApi } from '../../lib/api/spot';
import { arApi } from '../../lib/api/ar'; // 追加
import { storageApi } from '../../lib/api/storage'; // 追加
import type{ Database } from '../../types/supabase';

// フォームコンポーネントをインポート
import SpotRegistrationForm from '../../components/spotregistrationform';
import type { ARModel } from '../../components/spotregistrationform';

type Spot = Database['public']['Tables']['spots']['Row'];

const CATEGORIES = ['All', '観光', 'グルメ', 'イベント', 'アート', 'その他'];

const ListView: React.FC = () => {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [arModels, setArModels] = useState<ARModel[]>([]); // ARモデル一覧
  const [loading, setLoading] = useState(true);
  
  // フィルター
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // モーダル & 編集用
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // --- 編集フォーム用State (SpotRegistrationFormのPropsに合わせる) ---
  const [spotName, setSpotName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [spotDescription, setSpotDescription] = useState('');
  const [address, setAddress] = useState('');
  // 画像関連
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // 詳細設定
  const [selectedArModelId, setSelectedArModelId] = useState<string | ''>('');
  const [category, setCategory] = useState<string>('');
  const [pinColor, setPinColor] = useState<string>('#FF0000');
  const [radius, setRadius] = useState<number>(50);

  // 通知
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // --- データ取得 ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // スポットとARモデルを並列取得
        const [spotsRes, arRes] = await Promise.all([
          spotsApi.getAllActive(),
          arApi.getAll()
        ]);

        if (spotsRes.error) throw spotsRes.error;
        if (arRes.error) throw arRes.error;

        setSpots(spotsRes.data || []);
        
        // ARモデルの型変換
        const formattedArModels = (arRes.data || []).map(m => ({
          id: m.id,
          model_name: m.model_name,
          file_url: m.file_url || ''
        }));
        setArModels(formattedArModels);

      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- フィルタリング ---
  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      const matchesSearch = spot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (spot.description && spot.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || spot.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [spots, searchQuery, selectedCategory]);

  // --- ハンドラ ---
  const handleOpenDialog = (spot: Spot) => {
    setSelectedSpot(spot);
    setIsEditing(false);
  };

  const handleCloseDialog = () => {
    if (actionLoading) return;
    setSelectedSpot(null);
    setIsEditing(false);
    resetForm();
  };

  const resetForm = () => {
    setSpotName('');
    setSubtitle('');
    setSpotDescription('');
    setAddress('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedArModelId('');
    setCategory('');
    setPinColor('#FF0000');
    setRadius(50);
  };

  // 編集モード開始（現在の値をフォームStateにセット）
  const handleStartEdit = () => {
    if (selectedSpot) {
      setSpotName(selectedSpot.name);
      setSubtitle(selectedSpot.subtitle || '');
      setSpotDescription(selectedSpot.description || '');
      setAddress(selectedSpot.address);
      setImagePreview(selectedSpot.image_url); // 既存画像を表示
      setSelectedArModelId(selectedSpot.ar_model_id || '');
      setCategory(selectedSpot.category || '');
      setPinColor(selectedSpot.pin_color || '#FF0000');
      setRadius(selectedSpot.radius || 50);
      
      setIsEditing(true);
    }
  };

  // 画像変更ハンドラ
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // ファイル入力イベントを手動で発火させるのと同等の処理
      const file = e.dataTransfer.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 更新保存
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSpot || !selectedSpot.id) return;
    
    try {
      setActionLoading(true);

      let imageUrl = selectedSpot.image_url; // デフォルトは既存URL

      // 新しい画像がある場合のみアップロード
      if (imageFile) {
        setIsUploading(true);
        imageUrl = await storageApi.uploadSpotImage(imageFile);
        setIsUploading(false);
      }
      
      const updates = {
        name: spotName,
        subtitle: subtitle || null,
        description: spotDescription,
        // address: address, // 住所は変更しない
        category: category || null,
        image_url: imageUrl,
        ar_model_id: selectedArModelId || null,
        pin_color: pinColor,
        radius: radius,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await spotsApi.update(selectedSpot.id, updates);
      if (error) throw error;

      // ローカルState更新
      const updatedSpot = { ...selectedSpot, ...updates };
      setSpots(prev => prev.map(s => s.id === selectedSpot.id ? updatedSpot : s));
      setSelectedSpot(updatedSpot);
      
      setIsEditing(false);
      setSnackbar({ open: true, message: 'スポット情報を更新しました', severity: 'success' });

    } catch (error: any) {
      console.error('Update failed:', error);
      setSnackbar({ open: true, message: `更新失敗: ${error.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
      setIsUploading(false);
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!selectedSpot || !window.confirm(`「${selectedSpot.name}」を削除してもよろしいですか？`)) return;

    try {
      setActionLoading(true);
      const { error } = await spotsApi.softDelete(selectedSpot.id);
      if (error) throw error;

      setSpots(prev => prev.filter(s => s.id !== selectedSpot.id));
      handleCloseDialog();
      setSnackbar({ open: true, message: 'スポットを削除しました', severity: 'success' });

    } catch (error: any) {
      setSnackbar({ open: true, message: `削除失敗: ${error.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // 選択中のARモデル名を取得（詳細表示用）
  const getARModelName = (id: string | null) => {
    if (!id) return null;
    return arModels.find(m => m.id === id)?.model_name || '不明なモデル';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* --- ヘッダー & フィルター --- */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          スポット一覧
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="スポット名やキーワードで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
              }}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
              <FilterListIcon sx={{ color: 'action.active', mr: 1, alignSelf: 'center' }} />
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setSelectedCategory(cat)}
                  color={selectedCategory === cat ? 'primary' : 'default'}
                  variant={selectedCategory === cat ? 'filled' : 'outlined'}
                  clickable
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* --- リスト表示 --- */}
      <Grid container spacing={3}>
        {loading ? (
          Array.from(new Array(6)).map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <Skeleton variant="rectangular" height={180} />
                <CardContent>
                  <Skeleton variant="text" height={30} width="80%" />
                  <Skeleton variant="text" height={20} width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : filteredSpots.length > 0 ? (
          filteredSpots.map((spot) => (
            <Grid key={spot.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
                <CardActionArea onClick={() => handleOpenDialog(spot)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  {spot.image_url ? (
                    <CardMedia component="img" height="180" image={spot.image_url} alt={spot.name} sx={{ objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ height: 180, width: '100%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <ImageNotSupportedIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                      <Typography variant="caption" color="text.secondary">NO IMAGE</Typography>
                    </Box>
                  )}
                  <CardContent sx={{ width: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Typography gutterBottom variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
                        {spot.name}
                        </Typography>
                        {spot.ar_model_id && (
                             <Chip icon={<ViewInArIcon sx={{ fontSize: 16 }} />} label="AR" size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.65rem' } }} />
                        )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      mt: 1
                    }}>
                      {spot.description}
                    </Typography>
                    <Chip label={spot.category || 'その他'} size="small" sx={{ mt: 1, bgcolor: '#f0f0f0' }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h6" color="text.secondary">
                条件に一致するスポットが見つかりませんでした。
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* --- 詳細・編集ダイアログ --- */}
      <Dialog
        open={!!selectedSpot}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        {selectedSpot && (
          <>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                {isEditing ? 'スポット編集' : selectedSpot.name}
              </Typography>
              {!isEditing && (
                <IconButton aria-label="close" onClick={handleCloseDialog}>
                  <CloseIcon />
                </IconButton>
              )}
            </DialogTitle>
            
            <DialogContent dividers>
              {!isEditing ? (
                /* --- 閲覧モード (詳細表示) --- */
                <Stack spacing={2}>
                  {selectedSpot.image_url && (
                    <Box component="img" src={selectedSpot.image_url} alt={selectedSpot.name} sx={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 1, bgcolor: 'black' }} />
                  )}
                  
                  {/* カテゴリ・AR有無 */}
                  <Box>
                      <Chip label={selectedSpot.category || 'カテゴリ未設定'} color="primary" variant="outlined" size="small" sx={{ mr: 1 }} />
                  </Box>

                  {/* サブタイトル */}
                  {selectedSpot.subtitle && (
                    <Typography variant="subtitle1" color="primary.main" fontWeight="bold">{selectedSpot.subtitle}</Typography>
                  )}

                  {/* 説明 */}
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedSpot.description}</Typography>
                  
                  <Divider />
                  
                  {/* 詳細情報グリッド (AR, ピン色, 範囲) */}
                  <Typography variant="subtitle2" color="text.secondary">設定情報</Typography>
                  <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ViewInArIcon color="action" />
                            <Typography variant="body2">
                                {getARModelName(selectedSpot.ar_model_id) || 'ARなし'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ColorLensIcon style={{ color: selectedSpot.pin_color || 'grey' }} />
                            <Typography variant="body2">
                                ピン色
                            </Typography>
                        </Box>
                    </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RadarIcon color="action" />
                            <Typography variant="body2">
                                チェックイン範囲: <strong>{selectedSpot.radius || 50}m</strong>
                            </Typography>
                        </Box>
                    </Grid>
                  </Grid>
                  
                  <Divider />

                  {/* 住所 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', bgcolor: 'grey.100', p: 1.5, borderRadius: 1 }}>
                    <PlaceIcon fontSize="small" />
                    <Typography variant="body2">{selectedSpot.address}</Typography>
                  </Box>
                </Stack>
              ) : (
                /* --- 編集モード (SpotRegistrationForm 再利用) --- */
                <SpotRegistrationForm
                  isEditMode={true}
                  disableAddress={true} // 住所変更不可
                  
                  spotName={spotName} setSpotName={setSpotName}
                  subtitle={subtitle} setSubtitle={setSubtitle}
                  spotDescription={spotDescription} setSpotDescription={setSpotDescription}
                  address={address} setAddress={setAddress}
                  
                  imagePreview={imagePreview}
                  
                  selectedArModelId={selectedArModelId} setSelectedArModelId={setSelectedArModelId}
                  category={category} setCategory={setCategory}
                  pinColor={pinColor} setPinColor={setPinColor}
                  radius={radius} setRadius={setRadius}
                  
                  newPin={{ lat: selectedSpot.latitude, lng: selectedSpot.longitude }} // ダミー座標（フォーム有効化のため）
                  addressLoading={false}
                  submitting={actionLoading}
                  arModels={arModels}
                  isUploading={isUploading}
                  
                  handleSubmit={handleSave}
                  handleImageChange={handleImageChange}
                  fileInputRef={fileInputRef}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                />
              )}
            </DialogContent>
            
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              {isEditing ? (
                // 編集中のボタン
                <>
                  <Button 
                    startIcon={<CancelIcon />} 
                    onClick={() => { setIsEditing(false); resetForm(); }} 
                    color="inherit"
                    disabled={actionLoading}
                  >
                    キャンセル
                  </Button>
                  <Button 
                    startIcon={actionLoading ? <CircularProgress size={20} /> : <SaveIcon />} 
                    onClick={handleSave} 
                    variant="contained" 
                    color="primary"
                    disabled={actionLoading}
                  >
                    保存
                  </Button>
                </>
              ) : (
                // 閲覧中のボタン
                <>
                  <Box>
                    {isAdmin && (
                      <Button 
                        startIcon={<DeleteIcon />} 
                        onClick={handleDelete} 
                        color="error"
                        sx={{ mr: 1 }}
                      >
                        削除
                      </Button>
                    )}
                  </Box>
                  <Box>
                    {isAdmin && (
                      <Button 
                        startIcon={<EditIcon />} 
                        onClick={handleStartEdit} 
                        sx={{ mr: 1 }}
                      >
                        編集
                      </Button>
                    )}
                    <Button onClick={handleCloseDialog} variant="outlined">
                      閉じる
                    </Button>
                  </Box>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ListView;