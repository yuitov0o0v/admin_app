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
  Avatar, // ARモデル選択UIで使用するため残します
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material'; // アイコンを変更

// --- 型定義 (親コンポーネントからインポートして使用することを想定) ---
interface ARModel {
  id: number;
  name: string;
  image_url: string;
}
interface NewPin {
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
// --- ここまで ---


// --- Propsの型定義 ---
interface SpotRegistrationFormProps {
  // 状態
  spotName: string;
  subtitle: string;
  spotDescription: string;
  address: string;
  imagePreview: string | null; // previewUrlとして利用
  selectedArModelId: number | '';
  category: string;
  pinColor: string;
  radius: number;
  
  // 状態の更新関数
  setSpotName: (value: string) => void;
  setSubtitle: (value: string) => void;
  setSpotDescription: (value: string) => void;
  setAddress: (value: string) => void;
  setImageFile: (file: File | null) => void;
  setImagePreview: (url: string | null) => void;
  setSelectedArModelId: (value: number | '') => void;
  setCategory: (value: string) => void;
  setPinColor: (value: string) => void;
  setRadius: (value: number) => void;
  // setImageFile と setImagePreview は handleImageChange に内包される想定
  
  // UI制御用の状態
  newPin: NewPin | null;
  addressLoading: boolean;
  submitting: boolean;
  arModels: ARModel[];
  isUploading: boolean; // ★ 追加

  // イベントハンドラ
  handleSubmit: (event: React.FormEvent) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // handleFileChangeとして利用
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void; // ★ 追加
  handleDrop: (e: React.DragEvent<HTMLElement>) => void; // ★ 追加
  fileInputRef: React.RefObject<HTMLInputElement | null>; // ★ 追加
}


const SpotRegistrationForm: React.FC<SpotRegistrationFormProps> = ({
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
  isUploading,      // ★ 追加
  handleDragOver,   // ★ 追加
  handleDrop,       // ★ 追加
  fileInputRef,     // ★ 追加
}) => {
  // フォームが無効かどうかを判定
  const isFormDisabled = !newPin || submitting;

  return (
    <Box
      sx={{
        width: '100%',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        overflowY: 'auto',
        maxHeight: '100vh',
      }}
      component="form"
      onSubmit={handleSubmit}
    >
      <Typography variant="h6">Spot登録</Typography>
      <Typography variant="body2" color="textSecondary">
        {submitting 
          ? '登録処理中です。しばらくお待ちください...'
          : newPin
          ? '地図上のピンをドラッグして位置を調整できます。'
          : '地図をクリックしてスポットの位置を指定してください。'}
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
        disabled={isFormDisabled}
        InputProps={{
          endAdornment: addressLoading && <CircularProgress size={20} />
        }}
      />

      {/* --- 画像アップロード (ここから差し替え) --- */}
      <Box sx={{ width: '100%' }}>
        <Typography variant="subtitle1" gutterBottom>イメージ画像</Typography>
        <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange} // 既存のハンドラを適用
            style={{ display: 'none' }}
        />
        <Box
            sx={{
                border: '2px dashed grey',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                backgroundColor: isFormDisabled ? 'action.disabledBackground' : 'transparent',
                '&:hover': {
                    borderColor: isFormDisabled ? 'grey' : 'primary.main',
                    backgroundColor: isFormDisabled ? 'action.disabledBackground' : 'action.hover'
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
            ) : imagePreview ? ( // imagePreview を previewUrl として利用
                <img src={imagePreview} alt="プレビュー" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
            ) : (
                <Box>
                    <CloudUpload sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
                    <Typography color="text.secondary">クリック または ドラッグ&ドロップして画像をアップロード</Typography>
                </Box>
            )}
        </Box>
      </Box>
      {/* --- (ここまで) --- */}
      
      {/* --- 詳細設定 --- */}
      <FormControl fullWidth size="small" disabled={isFormDisabled}>
        <InputLabel>ARモデル</InputLabel>
        <Select 
          value={selectedArModelId} 
          label="ARモデル" 
          onChange={(e) => setSelectedArModelId(e.target.value as number | '')}
        >
          <MenuItem value=""><em>選択しない</em></MenuItem>
          {arModels.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={model.image_url} sx={{ width: 24, height: 24, mr: 1 }} variant="square" />
                {model.name}
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
                <Box sx={{ 
                  width: 16, 
                  height: 16, 
                  backgroundColor: color.value, 
                  borderRadius: '50%', 
                  border: '1px solid #ccc' 
                }} />
                {color.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
        <Typography gutterBottom>判定範囲: {radius}m</Typography>
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

      {/* --- 登録ボタン --- */}
      <Button type="submit" variant="contained" disabled={isFormDisabled}>
        {submitting ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            登録中...
          </>
        ) : (
          '登録する'
        )}
      </Button>
    </Box>
  );
};

export default SpotRegistrationForm;