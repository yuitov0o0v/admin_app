import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Switch,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Autocomplete,
  Stack,
  Alert,
  Chip // Chipコンポーネントを追加
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  CloudUpload as CloudUploadIcon,
  Save as SaveIcon,
  EventBusy as EventBusyIcon
} from '@mui/icons-material';

import { spotsApi } from '../../lib/api/spot';
import type{ Database } from '../../types/supabase';

type Spot = Database['public']['Tables']['spots']['Row'];

interface EventRegistrationFormProps {
  initialData?: any;
  isEditMode?: boolean;
  submitting: boolean;
  isUploading: boolean;
  onSubmit: (formData: any, spotIds: string[]) => void;
  onDelete?: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const EventRegistrationForm: React.FC<EventRegistrationFormProps> = ({
  initialData,
  isEditMode = false,
  submitting,
  isUploading,
  onSubmit,
  onDelete,
  onImageChange,
  imagePreview,
  fileInputRef
}) => {
  // --- フォームステート ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // --- バリデーション用ステート ---
  const [formError, setFormError] = useState<string | null>(null);

  // --- スポット選択用ステート ---
  const [allSpots, setAllSpots] = useState<Spot[]>([]);
  const [selectedSpots, setSelectedSpots] = useState<Spot[]>([]);
  // spotSelectorValue（単一選択用のステート）は削除し、selectedSpotsを直接使います

  useEffect(() => {
    const fetchSpots = async () => {
      const { data } = await spotsApi.getAllActive();
      if (data) setAllSpots(data);
    };
    fetchSpots();

    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setOrganizer(initialData.organizer || '');
      setStartTime(initialData.start_time ? initialData.start_time.slice(0, 16) : '');
      setEndTime(initialData.end_time ? initialData.end_time.slice(0, 16) : '');
      setIsPublic(initialData.is_public ?? true);
      
      if (initialData.event_spot) {
        const sorted = initialData.event_spot
          .sort((a: any, b: any) => a.order_in_event - b.order_in_event)
          .map((es: any) => es.spots);
        setSelectedSpots(sorted);
      }
    }
  }, [initialData]);

  // --- スポット操作ハンドラ ---
  
  // Autocompleteでの変更を一括処理
  const handleSpotsChange = (_: any, newValue: Spot[]) => {
    setSelectedSpots(newValue);
    if (newValue.length > 0) {
      setFormError(null);
    }
  };

  const handleRemoveSpot = (spotId: string) => {
    setSelectedSpots(selectedSpots.filter(s => s.id !== spotId));
  };

  const moveSpot = (index: number, direction: 'up' | 'down') => {
    const newSpots = [...selectedSpots];
    if (direction === 'up' && index > 0) {
      [newSpots[index], newSpots[index - 1]] = [newSpots[index - 1], newSpots[index]];
    } else if (direction === 'down' && index < newSpots.length - 1) {
      [newSpots[index], newSpots[index + 1]] = [newSpots[index + 1], newSpots[index]];
    }
    setSelectedSpots(newSpots);
  };

  // --- 送信ハンドラ ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. 日付バリデーション
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (start >= end) {
        setFormError('終了日時は開始日時より後に設定してください');
        return; 
      }
    }

    // 2. スポット数バリデーション
    if (selectedSpots.length === 0) {
      setFormError('イベントには最低でも1つ以上のスポットを登録してください');
      return;
    }

    const formData = {
      name,
      description,
      organizer,
      start_time: startTime || null,
      end_time: endTime || null,
      is_public: isPublic,
    };
    
    const spotIds = selectedSpots.map(s => s.id);
    onSubmit(formData, spotIds);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 1 }}>
      {formError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 左側: 基本情報 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">基本情報</Typography>
          <Stack spacing={3}>
            <TextField
              label="イベント名"
              fullWidth
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="主催者"
              fullWidth
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }} >
                <TextField
                  label="開始日時"
                  type="datetime-local"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setFormError(null);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }} >
                <TextField
                  label="終了日時"
                  type="datetime-local"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setFormError(null);
                  }}
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
              label="公開する"
            />
            <TextField
              label="説明"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            
            {/* 画像アップロード */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>メイン画像</Typography>
              <Box 
                sx={{ 
                  border: '2px dashed', 
                  borderColor: 'grey.300', 
                  p: 2, 
                  borderRadius: 2, 
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                  '&:hover': { borderColor: 'primary.main' }
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={onImageChange}
                  style={{ display: 'none' }}
                />
                {isUploading ? (
                  <CircularProgress size={24} />
                ) : imagePreview ? (
                  <Box onClick={() => fileInputRef.current?.click()} sx={{ cursor: 'pointer' }}>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain', borderRadius: 4 }} 
                    />
                    <Typography variant="caption" display="block" color="primary" sx={{ mt: 1 }}>
                      クリックして変更
                    </Typography>
                  </Box>
                ) : (
                  <Button
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    color="inherit"
                  >
                    画像をアップロード
                  </Button>
                )}
              </Box>
            </Box>
          </Stack>
        </Grid>

        {/* 右側: スポット管理 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            対象スポット設定 <Typography component="span" color="error">*</Typography>
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
            イベントで巡るスポットを選択してください。下のリストで順序を並び替えられます。
          </Typography>

          {/* 修正箇所: 複数選択可能なAutocompleteに変更 */}
          <Autocomplete
            multiple
            id="event-spots-select"
            options={allSpots}
            getOptionLabel={(option) => option.name}
            value={selectedSpots}
            onChange={handleSpotsChange}
            filterSelectedOptions
            renderTags={(value: readonly Spot[], getTagProps) =>
              value.map((option: Spot, index: number) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    variant="outlined"
                    label={option.name}
                    size="small"
                    key={key}
                    {...tagProps}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField 
                {...params} 
                variant="outlined" 
                label="スポットを追加（複数選択可）" 
                placeholder="スポット名で検索" 
              />
            )}
            sx={{ mb: 2 }}
          />

          <Paper variant="outlined" sx={{ maxHeight: 460, overflow: 'auto', bgcolor: 'background.default' }}>
            <List dense>
              {selectedSpots.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center', color: 'error.main' }}>
                  <EventBusyIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold">スポットが選択されていません</Typography>
                </Box>
              )}
              {selectedSpots.map((spot, index) => (
                <ListItem 
                  key={`${spot.id}-${index}`} 
                  divider 
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <Box 
                    sx={{ 
                      mr: 2, width: 24, height: 24, borderRadius: '50%', 
                      bgcolor: 'primary.main', color: 'white', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0
                    }}
                  >
                    {index + 1}
                  </Box>
                  <ListItemText 
                    primary={spot.name} 
                    secondary={spot.address} 
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                    secondaryTypographyProps={{ noWrap: true, sx: { maxWidth: 200 } }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => moveSpot(index, 'up')} disabled={index === 0}>
                      <ArrowUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => moveSpot(index, 'down')} disabled={index === selectedSpots.length - 1}>
                      <ArrowDownIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleRemoveSpot(spot.id)} 
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* フッター: アクションボタン */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            {isEditMode && onDelete ? (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={onDelete}
                disabled={submitting}
              >
                イベントを削除
              </Button>
            ) : <Box />}

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              disabled={submitting}
              sx={{ minWidth: 200 }}
            >
              {submitting ? '保存中...' : (isEditMode ? '更新する' : '作成する')}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EventRegistrationForm;