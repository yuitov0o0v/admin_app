import React, { useEffect, useState, useRef } from 'react';
import {
  Container, Grid, Card, CardContent, CardActions, Typography, Box, Button,
  Dialog, DialogTitle, DialogContent, Fab, Snackbar, Alert, TextField,
  CircularProgress, Stack, Chip, IconButton, CardMedia, Divider // CardMedia, Dividerを追加
} from '@mui/material';
import {
  Add as AddIcon, ViewInAr as ViewInArIcon, Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon, InsertDriveFile as FileIcon,
  Image as ImageIcon // ImageIconを追加
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { arApi } from '../../lib/api/ar';
import { storageApi } from '../../lib/api/storage';
import type{ Database } from '../../types/supabase';

// 型定義が未更新の場合のために補完（本来は自動生成されるべき）
type ArModel = Database['public']['Tables']['ar_model']['Row'] & { thumbnail_url?: string | null };

const ArModelView: React.FC = () => {
  const { user } = useAuth();

  // データState
  const [models, setModels] = useState<ArModel[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [openForm, setOpenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // フォームState
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null); // 【追加】サムネイル用

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null); // 【追加】サムネイル用Ref

  // --- データ取得 (変更なし) ---
  const fetchModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await arApi.getAll();
      if (error) throw error;
      setModels(data || []);
    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: 'データの取得に失敗しました', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // --- ハンドラ ---

  const handleOpenCreate = () => {
    setName('');
    setDescription('');
    setModelFile(null);
    setThumbnailFile(null); // リセット
    setOpenForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setModelFile(e.target.files[0]);
    }
  };

  // 【追加】サムネイル画像選択ハンドラ
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
    }
  };

  // 送信処理 (大幅修正)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelFile) {
      setSnackbar({ open: true, message: 'ARモデルファイル(3D)は必須です', severity: 'error' });
      return;
    }

    try {
      setSubmitting(true);

      // 1. 3Dモデル本体のアップロード
      const modelUrl = await storageApi.uploadArModel(modelFile);

      // 2. サムネイル画像のアップロード（もし選択されていれば）
      let thumbnailUrl = null;
      if (thumbnailFile) {
        thumbnailUrl = await storageApi.uploadArThumbnail(thumbnailFile);
      }

      // 3. DBへ保存 (thumbnail_url を追加)
      const newModel = {
        model_name: name,
        description: description,
        file_url: modelUrl,
        thumbnail_url: thumbnailUrl, // 【追加】
        file_size: modelFile.size,
        file_type: modelFile.name.split('.').pop() || 'unknown',
        created_by_user_id: user?.id || ''
      };

      const { error } = await arApi.create(newModel);
      if (error) throw error;

      setSnackbar({ open: true, message: 'ARモデルを登録しました', severity: 'success' });
      setOpenForm(false);
      fetchModels();

    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: `登録失敗: ${err.message}`, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // 削除処理 (変更なし)
  const handleDelete = async (id: string, modelName: string) => {
    if (!window.confirm(`ARモデル「${modelName}」を削除してもよろしいですか？\n(注意: 使用中のスポットがある場合、リンクが切れる可能性があります)`)) {
      return;
    }
    try {
      const { error } = await arApi.delete(id);
      if (error) throw error;
      setModels(prev => prev.filter(m => m.id !== id));
      setSnackbar({ open: true, message: '削除しました', severity: 'success' });
    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: `削除失敗: ${err.message}`, severity: 'error' });
    }
  };

  const formatBytes = (bytes: number | null, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">AR Models</Typography>
        <Fab color="primary" variant="extended" onClick={handleOpenCreate}>
          <AddIcon sx={{ mr: 1 }} />
          新規登録
        </Fab>
      </Box>

      <Grid container spacing={3}>
        {loading ? (
          <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}><CircularProgress /></Box>
        ) : models.length === 0 ? (
          <Box sx={{ width: '100%', textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            <ViewInArIcon sx={{ fontSize: 60, mb: 1, opacity: 0.5 }} />
            <Typography>登録されたARモデルはありません</Typography>
          </Box>
        ) : (
          models.map((model) => (
            <Grid key={model.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* 【修正】サムネイルがあれば画像を表示、なければ従来のアイコンを表示 */}
                {model.thumbnail_url ? (
                  <CardMedia
                    component="img"
                    height="140"
                    image={model.thumbnail_url}
                    alt={model.model_name}
                    sx={{ objectFit: 'cover', bgcolor: 'grey.100' }}
                  />
                ) : (
                  <Box sx={{ height: 140, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', borderBottom: '1px solid #eee' }}>
                    <ViewInArIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">.{model.file_type}</Typography>
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom noWrap title={model.model_name}>
                    {model.model_name}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    {/* サムネイルがある場合はファイル形式もチップで表示 */}
                    {model.thumbnail_url && (
                      <Chip label={`.${model.file_type}`} size="small" variant="outlined" sx={{ textTransform: 'uppercase' }} />
                    )}
                    <Chip label={formatBytes(model.file_size)} size="small" variant="outlined" />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ height: 40, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {model.description || '説明なし'}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button size="small" href={model.file_url} target="_blank" rel="noopener noreferrer">ダウンロード</Button>
                  <IconButton size="small" color="error" onClick={() => handleDelete(model.id, model.model_name)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* 登録ダイアログ */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ARモデル登録</DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Stack spacing={3}>
              <TextField label="モデル名" fullWidth required value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ティラノサウルス" />
              <TextField label="説明" fullWidth multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

              <Divider />

              {/* 1. 3Dモデルファイル入力 (必須) */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>1. 3Dモデルファイル (必須)</Typography>
                <Typography variant="caption" color="textSecondary">対応形式: .glb, .gltf, .usdz</Typography>
                <Box 
                  sx={{ mt: 1, border: '2px dashed', borderColor: 'primary.main', p: 2, borderRadius: 2, textAlign: 'center', bgcolor: 'primary.50', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" accept=".glb,.gltf,.usdz" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                  {modelFile ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <FileIcon color="primary" />
                      <Typography variant="body2" fontWeight="bold" noWrap>{modelFile.name}</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'primary.main' }}>
                      <CloudUploadIcon />
                      <Typography variant="body2">3Dファイルを選択</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* 2. サムネイル画像入力 (任意) */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>2. サムネイル画像 (任意)</Typography>
                <Typography variant="caption" color="textSecondary">一覧表示時に使用されます (jpg, png等)</Typography>
                <Box 
                  sx={{ mt: 1, border: '2px dashed', borderColor: 'grey.300', p: 2, borderRadius: 2, textAlign: 'center', bgcolor: 'grey.50', cursor: 'pointer', '&:hover': { borderColor: 'grey.500' } }}
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  <input type="file" accept="image/*" ref={thumbnailInputRef} onChange={handleThumbnailChange} style={{ display: 'none' }} />
                  {thumbnailFile ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <ImageIcon color="action" />
                      <Typography variant="body2" fontWeight="bold" noWrap>{thumbnailFile.name}</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'text.secondary' }}>
                      <ImageIcon />
                      <Typography variant="body2">画像ファイルを選択</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Button type="submit" variant="contained" size="large" disabled={submitting || !modelFile} sx={{ mt: 2 }}>
                {submitting ? 'アップロード中...' : '登録する'}
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ArModelView;