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
  IconButton,
} from '@mui/material';
import { PhotoCamera, Clear } from '@mui/icons-material';

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
  setAddress: (value: string) => void;
  imagePreview: string | null;
  selectedArModelId: number | '';
  category: string;
  pinColor: string;
  radius: number;
  
  // 状態の更新関数
  setSpotName: (value: string) => void;
  setSubtitle: (value: string) => void;
  setSpotDescription: (value: string) => void;
  setImageFile: (file: File | null) => void;
  setImagePreview: (url: string | null) => void;
  setSelectedArModelId: (value: number | '') => void;
  setCategory: (value: string) => void;
  setPinColor: (value: string) => void;
  setRadius: (value: number) => void;

  // UI制御用の状態
  newPin: NewPin | null;
  addressLoading: boolean;
  submitting: boolean;
  arModels: ARModel[];
  
  // イベントハンドラ
  handleSubmit: (event: React.FormEvent) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}


const SpotRegistrationForm: React.FC<SpotRegistrationFormProps> = ({
  spotName, setSpotName,
  subtitle, setSubtitle,
  spotDescription, setSpotDescription,
  address,
  setAddress,
  imagePreview, setImagePreview, setImageFile,
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
}) => {
  return (
    <Box
      sx={{
        width: '100%', // サイドバーの幅に追従
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        overflowY: 'auto', // フォームが長くなった場合にスクロール
        maxHeight: '100vh', // 必要に応じて調整
      }}
      component="form"
      onSubmit={handleSubmit}
    >
      <Typography variant="h6">Spot登録</Typography>
      <Typography variant="body2" color="textSecondary">
        {newPin
          ? '地図上のピンをドラッグして位置を調整できます。'
          : '地図をクリックしてスポットの位置を指定してください。'}
      </Typography>

      {/* --- 基本情報 --- */}
      <TextField label="スポット名" variant="outlined" size="small" required value={spotName} onChange={(e) => setSpotName(e.target.value)} disabled={!newPin} />
      <TextField label="サブタイトル（任意）" variant="outlined" size="small" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} disabled={!newPin} />
      <TextField label="説明" variant="outlined" size="small" multiline rows={3} value={spotDescription} onChange={(e) => setSpotDescription(e.target.value)} disabled={!newPin} />
      <TextField
        label="住所"
        variant="outlined"
        size="small"
        value={address}
        // disabled を削除
        onChange={(e) => setAddress(e.target.value)} // onChangeイベントを追加
        InputProps={{
          endAdornment: addressLoading && <CircularProgress size={20} />
        }}
      />

      {/* --- 画像アップロード --- */}
      <Box sx={{ border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>イメージ画像（任意）</Typography>
        {imagePreview ? (
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Avatar src={imagePreview} sx={{ width: 100, height: 100, mb: 1 }} variant="rounded" />
            <IconButton size="small" onClick={() => { setImageFile(null); setImagePreview(null); }} sx={{ position: 'absolute', top: -10, right: -10, backgroundColor: 'rgba(255,255,255,0.7)'}}>
              <Clear />
            </IconButton>
          </Box>
        ) : (
          <Button component="label" variant="outlined" startIcon={<PhotoCamera />} disabled={!newPin}>
            画像を選択
            <input type="file" accept="image/*" hidden onChange={handleImageChange} />
          </Button>
        )}
        <Typography variant="caption" display="block" color="textSecondary">
          クリックしてファイルを選択
        </Typography>
      </Box>
      
      {/* --- 詳細設定 --- */}
      <FormControl fullWidth size="small" disabled={!newPin}>
        <InputLabel>ARモデル</InputLabel>
        <Select value={selectedArModelId} label="ARモデル" onChange={(e) => setSelectedArModelId(e.target.value as number | '')}>
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

      <FormControl fullWidth size="small" disabled={!newPin}>
        <InputLabel>カテゴリー</InputLabel>
        <Select value={category} label="カテゴリー" onChange={(e) => setCategory(e.target.value)}>
          <MenuItem value=""><em>未選択</em></MenuItem>
          {CATEGORIES.map((cat) => ( <MenuItem key={cat} value={cat}>{cat}</MenuItem> ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" disabled={!newPin}>
        <InputLabel>ピンの色</InputLabel>
        <Select value={pinColor} label="ピンの色" onChange={(e) => setPinColor(e.target.value)}>
          {PIN_COLORS.map((color) => (
            <MenuItem key={color.value} value={color.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, backgroundColor: color.value, borderRadius: '50%', border: '1px solid #ccc' }} />
                {color.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
          <Typography gutterBottom>判定範囲: {radius}m</Typography>
          <Slider value={radius} onChange={(_, newValue) => setRadius(newValue as number)} step={10} min={10} max={200} valueLabelDisplay="auto" disabled={!newPin} />
      </Box>

      {/* --- 登録ボタン --- */}
      <Button type="submit" variant="contained" disabled={!newPin || submitting}>
        {submitting ? <CircularProgress size={24} /> : '登録する'}
      </Button>
    </Box>
  );
};

export default SpotRegistrationForm;