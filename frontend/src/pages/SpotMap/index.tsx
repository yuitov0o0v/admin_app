import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import ReactDOMServer from 'react-dom/server';
import L from 'leaflet';
import { supabase } from '../../lib/supabaseClient';
import { useSupabaseStorage } from '../../hooks/useSupabaseStorage';
import { Box, CircularProgress, Snackbar, Alert } from '@mui/material'; // import修正
import { LocationOn } from '@mui/icons-material';

// パスは実際の配置場所に合わせて確認してください
import SpotRegistrationForm from '../../components/spotRegistrationForm';

import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- アイコン設定 ---
const createColorIcon = (color: string) => {
  const iconSvgString = ReactDOMServer.renderToString(
    <LocationOn style={{ color: color, fontSize: '40px' }} />
  );

  return L.divIcon({
    html: iconSvgString,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'custom-div-icon'
  });
};

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- 型定義 ---
interface Spot {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  subtitle: string | null; // ✅ DBの型に合わせる
  address: string;   // ✅ DBの型に合わせる
  image_url: string | null; // ✅ image_urlも同様にnull許容にすべき
  ar_model_id: string | null; // ✅ null許容かつ number型に統一（ARModelも同様に修正が必要）
  category: string | null;  // ✅ null許容に修正
  pin_color: string | null; // ✅ pin_colorやradiusもDBの設定次第でnull許容の可能性があります
  radius: number | null;
}

interface ARModel {
  id: string;
  model_name: string;
  file_url: string;
}

interface NewPin {
  lat: number;
  lng: number;
}

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

const MapRegisterPageLeaflet: React.FC = () => {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [newPin, setNewPin] = useState<NewPin | null>(null);
  const newPinMarkerRef = useRef<L.Marker>(null);

  // --- フォーム用のState ---
  const [spotName, setSpotName] = useState('');
  const [spotDescription, setSpotDescription] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [arModels, setArModels] = useState<ARModel[]>([]);
  const [selectedArModelId, setSelectedArModelId] = useState<string | ''>('');
  const [category, setCategory] = useState<string>('');
  const [pinColor, setPinColor] = useState<string>(PIN_COLORS[0].value);
  const [radius, setRadius] = useState<number>(50);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const { uploadFile, isUploading, error: uploadError } = useSupabaseStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const newPinIcon = useMemo(() => {
    return createColorIcon(pinColor);
  }, [pinColor]);

  // --- データ取得 ---
  const fetchSpots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('spots').select('*');
    if (error) {
      console.error('Error fetching spots:', error);
    } else {
      setSpots(data || []);
    }
    setLoading(false);
  }, []);

  // ARモデルをSupabaseから取得
  const fetchArModels = useCallback(async () => {
    // テーブル名は 'ar_model' で続行
    const { data, error } = await supabase.from('ar_model').select('id, model_name, file_url');

    if (error) {
      console.error('Error fetching AR models:', error);
    } else {
      // dataがnullでないことを保証してからセット
      setArModels(data || []); // ✅ dataがnullの場合のハンドリングを強化
    }
  }, []);

  useEffect(() => {
    fetchSpots();
    fetchArModels();
  }, [fetchSpots, fetchArModels]);
  
  // --- フォームリセット ---
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
      setPinColor(PIN_COLORS[0].value);
      setRadius(50);
  }

  // --- ハンドラ ---
  const handleMapClick = (latlng: L.LatLng) => {
    setNewPin({ lat: latlng.lat, lng: latlng.lng });
  };

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPin || !spotName) {
      alert('ピンを配置し、スポット名を入力してください。');
      return;
    }
    setSubmitting(true);

    let imageUrl = '';
    if (imageFile) {
      // バケット名 'spot_images' は環境に合わせて確認してください
      const newUrl = await uploadFile('spot_images', imageFile); 
      if (newUrl) {
        imageUrl = newUrl;
      } else {
        alert('画像のアップロードに失敗しました: ' + uploadError?.message);
        setSubmitting(false);
        return;
      }
    }

    const spotData = {
      name: spotName,
      description: spotDescription,
      latitude: newPin.lat,
      longitude: newPin.lng,
      subtitle: subtitle || null,
      address: address ,
      image_url: imageUrl || null,
      ar_model_id: selectedArModelId || null,
      category: category || null,
      pin_color: pinColor,
      radius: radius,
    };

    const { error } = await supabase.from('spots').insert(spotData) as { error: any };

    if (error) {
      alert('登録に失敗しました: ' + error.message);
    } else {
      setSnackbarOpen(true);
      resetForm();
      await fetchSpots();
    }
    setSubmitting(false);
  };

  // 住所取得
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
        setAddress('住所の取得に失敗しました。');
      } finally {
        setAddressLoading(false);
      }
    };

    fetchAddress();
  }, [newPin]);

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      {/* --- 左側: マップ --- */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[34.69944, 135.21833]}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {spots.map((spot) => {
            const color = spot.pin_color || '#2A81CB';
            const spotIcon = createColorIcon(color);
            return(
              <Marker
                key={spot.id}
                position={[spot.latitude, spot.longitude]}
                icon={spotIcon}
              >
                <Popup>
                  <b>{spot.name}</b><br />
                  {spot.description}
                </Popup>
              </Marker>
          )})}
          {newPin && (
            <Marker
              position={newPin}
              draggable={true}
              eventHandlers={eventHandlers}
              ref={newPinMarkerRef}
              icon={newPinIcon}
            >
              <Popup>新しいスポットの位置</Popup>
            </Marker>
          )}
        </MapContainer>

        {loading && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      {/* --- 右側: 登録フォーム --- */}
      <Box sx={{ width: 360, borderLeft: '1px solid #ddd', height: '100vh', display: 'flex' }}>
        <SpotRegistrationForm
          spotName={spotName} setSpotName={setSpotName}
          subtitle={subtitle} setSubtitle={setSubtitle}
          spotDescription={spotDescription} setSpotDescription={setSpotDescription}
          address={address} setAddress={setAddress}
          imagePreview={imagePreview}
          // Note: setImageFile と setImagePreview は親コンポーネントで管理し
          // handleImageChange で更新するため、Propsとしては渡さない
          selectedArModelId={selectedArModelId} setSelectedArModelId={setSelectedArModelId}
          category={category} setCategory={setCategory}
          pinColor={pinColor} setPinColor={setPinColor}
          radius={radius} setRadius={setRadius}
          newPin={newPin}
          addressLoading={addressLoading}
          submitting={submitting}
          arModels={arModels}
          handleSubmit={handleSubmit}
          handleImageChange={handleImageChange}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
        />
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%', fontSize: '1.1rem', alignItems: 'center' }}
        >
          登録が完了しました！
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MapRegisterPageLeaflet;