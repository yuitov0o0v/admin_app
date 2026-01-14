import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import ReactDOMServer from 'react-dom/server';
import L from 'leaflet';
import { 
  Box, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Typography, 
  // Card, 
  // CardMedia, 
  // CardContent, 
  Chip,
  Divider,
  Stack
} from '@mui/material';
import { LocationOn, Place as PlaceIcon } from '@mui/icons-material';

// --- Imports from Project Structure ---
import { useAuth } from '../../context/AuthContext'; // 認証コンテキスト
import { spotsApi } from '../../lib/api/spot'; // ヘルパー利用
import { arApi } from '../../lib/api/ar'; // ヘルパー利用
import { storageApi } from '../../lib/api/storage'; // ヘルパー利用
import type{ Database } from '../../types/supabase'; // Supabase型定義

// --- Components ---
import SpotRegistrationForm from '../../components/spotRegistrationForm';
import type{ARModel, NewPin } from '../../components/spotRegistrationForm';

// --- Leaflet CSS ---
import 'leaflet/dist/leaflet.css';
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- Icon Setup ---
const createColorIcon = (color: string) => {
  const iconSvgString = ReactDOMServer.renderToString(
    <LocationOn style={{ color: color, fontSize: '40px', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }} />
  );

  return L.divIcon({
    html: iconSvgString,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'custom-div-icon'
  });
};

const DefaultIcon = L.icon({
    iconUrl: iconMarker,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Types ---
type Spot = Database['public']['Tables']['spots']['Row'];

interface MapClickHandlerProps {
  onMapClick: (latlng: L.LatLng) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

const SpotMap: React.FC = () => {
  const { user, isAdmin } = useAuth();
  
  // Data State
  const [spots, setSpots] = useState<Spot[]>([]);
  const [arModels, setArModels] = useState<ARModel[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [newPin, setNewPin] = useState<NewPin | null>(null);
  const newPinMarkerRef = useRef<L.Marker>(null);
  
  // Form State
  const [spotName, setSpotName] = useState('');
  const [spotDescription, setSpotDescription] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedArModelId, setSelectedArModelId] = useState<string | ''>('');
  const [category, setCategory] = useState<string>('');
  const [pinColor, setPinColor] = useState<string>('#FF0000');
  const [radius, setRadius] = useState<number>(50);

  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Spot取得 (ヘルパー経由)
      const { data: spotsData, error: spotsError } = await spotsApi.getAllActive();
      if (spotsError) throw spotsError;
      setSpots(spotsData || []);

      // 2. ARモデル取得 (ヘルパー経由)
      const { data: arData, error: arError } = await arApi.getAll();
      if (arError) throw arError;
      
      // 型変換: DBのRow型をUI用ARModel型に合わせる
      // (DBのfile_urlがnullの場合は空文字として扱うなどの調整)
      const formattedArModels = (arData || []).map(m => ({
        id: m.id,
        model_name: m.model_name,
        file_url: m.file_url || ''
      }));
      setArModels(formattedArModels);

    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({ open: true, message: 'データの取得に失敗しました', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Form Reset ---
  const resetForm = () => {
      setNewPin(null);
      setSpotName('');
      setSpotDescription('');
      setSubtitle('');
      setAddress('');
      setImageFile(null);
      setImagePreview(null);
      setSelectedArModelId('');
      setCategory('');
      setPinColor('#FF0000');
      setRadius(50);
  };

  // --- Map Handlers ---
  const handleMapClick = (latlng: L.LatLng) => {
    // Adminのみピンを立てられるようにする場合
    // if (!isAdmin) return; 
    setNewPin({ lat: latlng.lat, lng: latlng.lng });
  };

  const newPinIcon = useMemo(() => createColorIcon(pinColor), [pinColor]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = newPinMarkerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          setNewPin({ lat, lng });
        }
      },
    }),
    [],
  );

  // --- Image Handling ---
  const handleFileSelect = (file: File | null) => {
    if (file) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // --- Address Fetching (GSI API) ---
  useEffect(() => {
    if (!newPin) {
      setAddress('');
      return;
    };

    const fetchAddress = async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(`https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${newPin.lat}&lon=${newPin.lng}`);
        const data = await res.json();
        if (data && data.results) {
            setAddress(data.results.muniCd + data.results.lv01Nm);
        } else {
            setAddress('住所が見つかりませんでした。');
        }
      } catch (error) {
        console.error("Error fetching address:", error);
        setAddress('住所取得エラー');
      } finally {
        setAddressLoading(false);
      }
    };

    fetchAddress();
  }, [newPin]);

  // --- Submit Handler ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPin || !spotName) {
      setSnackbar({ open: true, message: 'ピンを配置し、スポット名を入力してください', severity: 'error' });
      return;
    }
    setSubmitting(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        setIsUploading(true);
        // ヘルパー経由でアップロード
        imageUrl = await storageApi.uploadSpotImage(imageFile);
        setIsUploading(false);
      }

      // Supabase型定義に合わせたデータ構築
      const spotData = {
        name: spotName,
        description: spotDescription,
        latitude: newPin.lat,
        longitude: newPin.lng,
        subtitle: subtitle || null,
        address: address,
        image_url: imageUrl || null,
        ar_model_id: selectedArModelId || null,
        category: category || null,
        pin_color: pinColor,
        radius: radius,
        is_active: true, // デフォルトで有効化
        created_by_user: user?.id || null
      };

      // ヘルパー経由でDB保存
      const { error } = await spotsApi.create(spotData);

      if (error) throw error;

      setSnackbar({ open: true, message: 'スポットを登録しました！', severity: 'success' });
      resetForm();
      await fetchData(); // リスト更新

    } catch (error: any) {
      console.error('Registration failed:', error);
      setSnackbar({ open: true, message: `登録失敗: ${error.message}`, severity: 'error' });
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', height: 'calc(100vh - 64px)' /* AppBar分を引く */ }}>
      {/* --- 左側: マップエリア --- */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[34.69944, 135.21833]} // 神戸周辺を初期値
          zoom={17}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapClickHandler onMapClick={handleMapClick} />
          
          {/* 既存スポットの表示 */}
          {spots.map((spot) => {
            const color = spot.pin_color || '#2A81CB';
            const spotIcon = createColorIcon(color);
            return(
              <Marker
                key={spot.id}
                position={[spot.latitude, spot.longitude]}
                icon={spotIcon}
              >
                <Popup maxWidth={280} minWidth={240} className="custom-popup">
                  {/* MUIスタイルを適用したポップアップコンテンツ */}
                  <Box sx={{ m: -1 }}> {/* Leafletのデフォルトpaddingを打ち消す */}
                    {spot.image_url && (
                      <Box 
                        component="img" 
                        src={spot.image_url} 
                        alt={spot.name} 
                        sx={{ 
                          width: '100%', 
                          height: 140, 
                          objectFit: 'cover', 
                          borderRadius: '4px 4px 0 0',
                          display: 'block'
                        }} 
                      />
                    )}
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip 
                          label={spot.category || 'Spot'} 
                          size="small" 
                          color="primary" 
                          sx={{ height: 20, fontSize: '0.7rem' }} 
                        />
                        {spot.ar_model_id && (
                          <Chip 
                            label="AR" 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }} 
                          />
                        )}
                      </Stack>
                      
                      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: 1.3, mb: 0.5 }}>
                        {spot.name}
                      </Typography>
                      
                      {spot.subtitle && (
                        <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                          {spot.subtitle}
                        </Typography>
                      )}

                      <Typography variant="body2" color="text.secondary" sx={{ 
                        fontSize: '0.8rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1
                      }}>
                        {spot.description}
                      </Typography>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                        <PlaceIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {spot.address}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Popup>
              </Marker>
          )})}

          {/* 新規登録用のピン */}
          {newPin && (
            <Marker
              position={newPin}
              draggable={true}
              eventHandlers={eventHandlers}
              ref={newPinMarkerRef}
              icon={newPinIcon}
            >
              <Popup>新規スポット位置</Popup>
            </Marker>
          )}
        </MapContainer>

        {loading && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      {/* --- 右側: 登録フォーム (サイドバー) --- */}
      {/* isAdmin チェックを入れると、管理者以外にはフォームを表示しないなどの制御が可能。
         ここではレイアウト通り常に表示しますが、実運用では `isAdmin && ...` で囲むことが多いです。
       */}
      <Box sx={{ width: 380, borderLeft: '1px solid #e0e0e0', height: '100%', bgcolor: 'background.paper' }}>
        <SpotRegistrationForm
          spotName={spotName} setSpotName={setSpotName}
          subtitle={subtitle} setSubtitle={setSubtitle}
          spotDescription={spotDescription} setSpotDescription={setSpotDescription}
          address={address} setAddress={setAddress}
          imagePreview={imagePreview}
          
          selectedArModelId={selectedArModelId} setSelectedArModelId={setSelectedArModelId}
          category={category} setCategory={setCategory}
          pinColor={pinColor} setPinColor={setPinColor}
          radius={radius} setRadius={setRadius}
          
          newPin={newPin}
          addressLoading={addressLoading}
          submitting={submitting}
          arModels={arModels}
          isUploading={isUploading}
          
          handleSubmit={handleSubmit}
          handleImageChange={handleImageChange}
          fileInputRef={fileInputRef}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
        />
      </Box>

      {/* --- 通知 --- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SpotMap;