import React, { useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import { LatLng } from 'leaflet';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Typography,
  Paper,
  Alert
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// スポットデータの型定義
interface Spot {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

// 新しいスポットを追加するためのコンポーネント
const AddSpotMarker: React.FC<{ onMapClick: (latlng: LatLng) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const SpotRegistrationMap: React.FC = () => {
  // 登録済みのスポット
  const [spots, setSpots] = useState<Spot[]>([]);
  // 新規追加するスポットの座標
  const [newSpotPosition, setNewSpotPosition] = useState<LatLng | null>(null);
  // 入力モーダルの開閉状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  // フォームの入力値
  const [spotName, setSpotName] = useState('');
  const [spotDescription, setSpotDescription] = useState('');
  // 処理中の状態
  const [isLoading, setIsLoading] = useState(false);
  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Supabaseからスポットデータを取得する関数
  const fetchSpots = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.from('spots').select('*');
      if (error) throw error;
      setSpots(data || []);
    } catch (error: any) {
      setErrorMessage(`データの取得に失敗しました: ${error.message}`);
      console.error('Error fetching spots:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期表示時にスポットデータを取得
  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  // 地図クリック時の処理
  const handleMapClick = (latlng: LatLng) => {
    setNewSpotPosition(latlng);
    setIsModalOpen(true);
  };

  // モーダルを閉じる処理
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewSpotPosition(null);
    // フォームをリセット
    setSpotName('');
    setSpotDescription('');
  };

  // スポットを保存する処理
  const handleSaveSpot = async () => {
    if (!spotName.trim() || !newSpotPosition) {
      alert('スポット名を入力してください。');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from('spots').insert([
        {
          name: spotName,
          description: spotDescription,
          latitude: newSpotPosition.lat,
          longitude: newSpotPosition.lng,
        },
      ]);
      if (error) throw error;

      // 保存成功後、最新のデータを再取得してモーダルを閉じる
      await fetchSpots();
      handleCloseModal();

    } catch (error: any) {
      setErrorMessage(`保存に失敗しました: ${error.message}`);
      console.error('Error saving spot:', error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Box sx={{ position: 'relative', height: 'calc(100vh - 64px)', width: '100%' }}>
       <Paper elevation={3} sx={{ p: 2, mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <Typography variant="h6" gutterBottom>
          スポット登録マップ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          地図上をクリックして新しいスポットを追加してください。
        </Typography>
         {errorMessage && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage}</Alert>}
      </Paper>

      <MapContainer
        center={[34.6991604, 135.2167765]} // 初期表示: 兵庫県民美術館
        zoom={16}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* 登録済みのスポットをマーカーとして表示 */}
        {spots.map((spot) => (
          <Marker key={spot.id} position={[spot.latitude, spot.longitude]}>
            <Popup>
              <Typography variant="subtitle2" component="div">{spot.name}</Typography>
              <Typography variant="body2">{spot.description}</Typography>
            </Popup>
          </Marker>
        ))}

        {/* 新しく追加するスポットのマーカー */}
        {newSpotPosition && <Marker position={newSpotPosition}></Marker>}

        {/* 地図のクリックイベントをハンドリング */}
        <AddSpotMarker onMapClick={handleMapClick} />
      </MapContainer>

      {/* スポット情報入力モーダル */}
      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogTitle>新しいスポットを作成</DialogTitle>
        <DialogContent>
          <DialogContentText>
            スポットの名前と詳細を入力してください。
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="スポット名"
            type="text"
            fullWidth
            variant="standard"
            value={spotName}
            onChange={(e) => setSpotName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            id="description"
            label="詳細"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="standard"
            value={spotDescription}
            onChange={(e) => setSpotDescription(e.target.value)}
          />
           {newSpotPosition && (
            <Typography variant="caption" color="text.secondary" sx={{mt:2}}>
              緯度: {newSpotPosition.lat.toFixed(6)}, 経度: {newSpotPosition.lng.toFixed(6)}
            </Typography>
           )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>キャンセル</Button>
          <Button onClick={handleSaveSpot} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpotRegistrationMap;