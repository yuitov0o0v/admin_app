import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Avatar,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

// --- 型定義 ---
export interface ARModel {
  id: string;
  model_name: string;
  file_url: string;
}

export interface NewPin {
  lat: number;
  lng: number;
}

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

interface SpotRegistrationFormProps {
  // --- モード制御用 (追加) ---
  isEditMode?: boolean;      // 編集モードならTrue
  disableAddress?: boolean;  // 住所を編集不可にするならTrue

  // 状態 (値)
  spotName: string;
  subtitle: string;
  spotDescription: string;
  address: string;
  imagePreview: string | null;
  selectedArModelId: string | '';
  category: string;
  pinColor: string;
  radius: number;
  
  // 状態の更新関数
  setSpotName: (value: string) => void;
  setSubtitle: (value: string) => void;
  setSpotDescription: (value: string) => void;
  setAddress: (value: string) => void;
  setSelectedArModelId: (value: string | '') => void;
  setCategory: (value: string) => void;
  setPinColor: (value: string) => void;
  setRadius: (value: number) => void;

  // UI制御用の状態
  newPin: NewPin | null;
  addressLoading: boolean;
  submitting: boolean;
  arModels: ARModel[];
  isUploading: boolean;

  // イベントハンドラ
  handleSubmit: (event: React.FormEvent) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const SpotRegistrationForm: React.FC<SpotRegistrationFormProps> = ({
  isEditMode = false,
  disableAddress = false,
  spotName, setSpotName,
  subtitle, setSubtitle,
  spotDescription, setSpotDescription,
  address, setAddress,
  imagePreview,
  selectedArModelId, setSelectedArModelId,
  category, setCategory,
  pinColor, setPinColor,
  radius, setRadius,
  newPin,
  addressLoading,
  submitting,
  arModels,
  handleSubmit,
  handleImageChange,
  isUploading,
  handleDragOver,
  handleDrop,
  fileInputRef,
}) => {
  // フォーム操作のロック判定
  const isFormDisabled = !newPin || submitting;

  return (
    <Box
      sx={{
        width: '100%',
        p: isEditMode ? 0 : 3, // モーダル内ならpadding不要
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        overflowY: 'auto',
        // モーダル内ではスクロール制御を親に任せるため maxHeight を調整
        maxHeight: isEditMode ? 'none' : '100vh', 
      }}
      component="form"
      onSubmit={handleSubmit}
    >
      {!isEditMode && <Typography variant="h6" fontWeight="bold">スポット登録</Typography>}
      
      {/* 案内文 */}
      <Typography variant="body2" color="textSecondary">
        {submitting 
          ? '処理中です...'
          : isEditMode
          ? 'スポットの情報を編集します。'
          : newPin
          ? 'ピンをドラッグして位置を微調整できます。'
          : '地図をクリックして登録したい場所を選択してください。'}
      </Typography>

      {/* --- 基本情報 --- */}
      <TextField 
        label="スポット名" 
        variant="outlined" 
        size="small" 
        required 
        value={spotName} 
        onChange={(e) => setSpotName(e.target.value)} 
        disabled={isFormDisabled}
      />
      <TextField 
        label="サブタイトル（任意）" 
        variant="outlined" 
        size="small" 
        value={subtitle} 
        onChange={(e) => setSubtitle(e.target.value)} 
        disabled={isFormDisabled}
      />
      <TextField 
        label="説明" 
        variant="outlined" 
        size="small" 
        multiline 
        rows={3} 
        value={spotDescription} 
        onChange={(e) => setSpotDescription(e.target.value)} 
        disabled={isFormDisabled}
      />
      <TextField
        label="住所"
        variant="outlined"
        size="small"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        // 住所は disableAddress が true なら常に無効化
        disabled={isFormDisabled || disableAddress}
        InputProps={{
          endAdornment: addressLoading && <CircularProgress size={20} />
        }}
        helperText={disableAddress ? "住所は変更できません（座標との不整合を防ぐため）" : ""}
      />

      {/* --- 画像アップロード --- */}
      <Box sx={{ width: '100%' }}>
        <Typography variant="subtitle2" gutterBottom>画像</Typography>
        <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            style={{ display: 'none' }}
        />
        <Box
            sx={{
                border: '2px dashed',
                borderColor: isFormDisabled ? 'action.disabled' : 'grey.400',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                bgcolor: isFormDisabled ? 'action.hover' : 'background.paper',
                '&:hover': {
                    borderColor: isFormDisabled ? 'action.disabled' : 'primary.main',
                    bgcolor: isFormDisabled ? 'action.hover' : 'action.selected'
                },
                minHeight: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                position: 'relative',
            }}
            onDragOver={isFormDisabled ? undefined : handleDragOver}
            onDrop={isFormDisabled ? undefined : handleDrop}
            onClick={() => !isFormDisabled && fileInputRef.current?.click()}
        >
            {isUploading ? (
                <CircularProgress />
            ) : imagePreview ? (
                <img src={imagePreview} alt="プレビュー" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
            ) : (
                <Box>
                    <CloudUpload sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="textSecondary">クリック または D&D</Typography>
                </Box>
            )}
        </Box>
      </Box>
      
      {/* --- 詳細設定 --- */}
      <FormControl fullWidth size="small" disabled={isFormDisabled}>
        <InputLabel>ARモデル</InputLabel>
        <Select 
          value={selectedArModelId} 
          label="ARモデル" 
          onChange={(e) => setSelectedArModelId(e.target.value as string)}
        >
          <MenuItem value=""><em>なし</em></MenuItem>
          {arModels.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {model.file_url && <Avatar src={model.file_url} sx={{ width: 24, height: 24, mr: 1 }} variant="square" />}
                {model.model_name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" disabled={isFormDisabled}>
        <InputLabel>カテゴリー</InputLabel>
        <Select value={category} label="カテゴリー" onChange={(e) => setCategory(e.target.value)}>
          <MenuItem value=""><em>未選択</em></MenuItem>
          {CATEGORIES.map((cat) => ( <MenuItem key={cat} value={cat}>{cat}</MenuItem> ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" disabled={isFormDisabled}>
        <InputLabel>ピンの色</InputLabel>
        <Select value={pinColor} label="ピンの色" onChange={(e) => setPinColor(e.target.value)}>
          {PIN_COLORS.map((color) => (
            <MenuItem key={color.value} value={color.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: color.value, borderRadius: '50%', border: '1px solid #ccc' }} />
                {color.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
        <Typography variant="body2" gutterBottom>チェックイン判定範囲: {radius}m</Typography>
        <Slider
          value={radius}
          onChange={(_, newValue) => setRadius(newValue as number)}
          step={10}
          min={10}
          max={200}
          valueLabelDisplay="auto"
          disabled={isFormDisabled}
        />
      </Box>

      {/* --- ボタン (編集モードでは親側で制御するため非表示にすることも可能だが、今回は親のDialogActionsを使うため非表示にする) --- */}
      {!isEditMode && (
        <Button 
          type="submit" 
          variant="contained" 
          size="large"
          disabled={isFormDisabled}
          sx={{ mt: 1 }}
        >
          {submitting ? '登録中...' : 'スポットを登録'}
        </Button>
      )}
    </Box>
  );
};

export default SpotRegistrationForm;