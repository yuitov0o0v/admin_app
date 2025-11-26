import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import ReactDOMServer from 'react-dom/server'; // React要素を文字列に変換するために必要
import L from 'leaflet';
import { supabase } from '../../supabaseClient';
import { useSupabaseStorage } from '../../hooks/useSupabaseStorage';
import { Box, CircularProgress,  } from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { Snackbar, Alert } from '@mui/material';
import SpotRegistrationForm from '../../components/spotRegistrationForm';

// LeafletのCSSをインポート
import 'leaflet/dist/leaflet.css';

// --- Leafletのデフォルトアイコン設定 ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Material-UIのLocationOnアイコンを使ってカスタムアイコンを作成する関数
const createColorIcon = (color: string) => {
  // Material-UIのアイコンをSVG文字列としてレンダリング
  const iconSvgString = ReactDOMServer.renderToString(
    <LocationOn style={{ color: color, fontSize: '40px' }} />
  );

  return L.divIcon({
    html: iconSvgString,
    // アイコンのサイズとアンカー（先端）の位置を調整
    iconSize: [40, 40],
    iconAnchor: [20, 40], // アイコンの先端が座標に合うように調整
    popupAnchor: [0, -40],
    // divIconのデフォルトスタイルを無効化するためのクラス名
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
// --- ここまで ---

// --- 型定義 ---
// DBのspotsテーブルの型定義
interface Spot {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
  address?: string;
  image_url?: string;
  ar_model_id?: number;
  category?: string;
  pin_color?: string;
  radius?: number;
}

// ARモデルの型定義
interface ARModel {
  id: number;
  name: string;
  image_url: string;
}

// 新規ピンの型定義
interface NewPin {
  lat: number;
  lng: number;
}

// MapClickHandlerコンポーネントのpropsの型を定義
interface MapClickHandlerProps {
  onMapClick: (latlng: L.LatLng) => void;
}

// 地図クリックイベントをハンドリングするためのコンポーネント
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

  // --- フォーム用のState (全てこのコンポーネントで管理) ---
  const [spotName, setSpotName] = useState('');
  const [spotDescription, setSpotDescription] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [arModels, setArModels] = useState<ARModel[]>([]);
  const [selectedArModelId, setSelectedArModelId] = useState<number | ''>('');
  const [category, setCategory] = useState<string>('');
  const [pinColor, setPinColor] = useState<string>(PIN_COLORS[0].value);
  const [radius, setRadius] = useState<number>(50);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Supabase Storage用のカスタムフック
  const { uploadFile, isUploading, error: uploadError } = useSupabaseStorage();

  // ファイル入力用のref
  const fileInputRef = useRef<HTMLInputElement>(null);


  // 新しいピンのアイコンをピンカラーに応じて動的に生成
  const newPinIcon = useMemo(() => {
    return createColorIcon(pinColor);
  }, [pinColor]);
  // --- データ取得関連 ---
  // 既存のスポットをSupabaseから取得
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
    const { data, error } = await supabase.from('ar_models').select('id, name, image_url');
    if (error) {
      console.error('Error fetching AR models:', error);
    } else {
      setArModels(data || []);
    }
  }, []);

  // 初期表示時にスポットとARモデルを取得
  useEffect(() => {
    fetchSpots();
    fetchArModels();
  }, [fetchSpots, fetchArModels]);
  
  // --- フォームのリセット ---
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

  // --- イベントハンドラ ---
  // 1. 地図をクリックしたときの処理
  const handleMapClick = (latlng: L.LatLng) => {
    setNewPin({ lat: latlng.lat, lng: latlng.lng });
  };

  // 2. 新規ピンをドラッグで微調整したときの処理
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

  // 3. 画像ファイルが選択されたときの処理
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

  // ファイル選択ダイアログを開く

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  // 🔽 修正点2: ドラッグオーバー時の処理を追加
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // これがないと onDrop イベントが発火しない
  };
  // ドロップ時の処理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // 4. フォームが送信されたときの処理
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPin || !spotName) {
      alert('ピンを配置し、スポット名を入力してください。');
      return;
    }
    setSubmitting(true);

    let imageUrl = '';
    // 画像が選択されていればStorageにアップロード
    if (imageFile) {
      const newUrl = await uploadFile('spot_images', imageFile); // バケット名を指定

      if (newUrl) {
        // アップロードが成功したらURLをimageUrlに設定
        imageUrl = newUrl;
      } else {
        // アップロードが失敗した場合
        alert('画像のアップロードに失敗しました: ' + uploadError?.message);
        setSubmitting(false);
        return; // 処理を中断
      }
    }

    // DBに登録するデータ
    const spotData = {
      name: spotName,
      description: spotDescription,
      latitude: newPin.lat,
      longitude: newPin.lng,
      subtitle: subtitle || null,
      address: address || null,
      image_url: imageUrl || null,
      ar_model_id: selectedArModelId || null,
      category: category || null,
      pin_color: pinColor,
      radius: radius,
    };

    const { error } = await supabase.from('spots').insert(spotData);

    if (error) {
      alert('登録に失敗しました: ' + error.message);
    } else {
      // alert('登録が完了しました！');
      setSnackbarOpen(true); // スナックバーを表示
      resetForm(); // フォームをリセット
      await fetchSpots();
    }
    setSubmitting(false);
  };

  // 緯度経度から住所を自動取得する
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
      {/* --- 左側: マップ表示エリア --- */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[34.69944, 135.21833]} // 兵庫県立美術館
          zoom={17}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {spots.map((spot) => {
            const color = spot.pin_color || '#2A81CB'; // デフォルトはLeaflet標準のような青色
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

      {/* --- 右側: 既存のサイドバーに相当するエリア --- */}
      <Box sx={{ width: 360, borderLeft: '1px solid #ddd', height: '100vh', display: 'flex' }}>
        <SpotRegistrationForm
          // 状態とその更新関数を全てpropsとして渡す
          spotName={spotName} setSpotName={setSpotName}
          subtitle={subtitle} setSubtitle={setSubtitle}
          spotDescription={spotDescription} setSpotDescription={setSpotDescription}
          address={address}
          setAddress={setAddress}
          imagePreview={imagePreview} setImagePreview={setImagePreview} setImageFile={setImageFile}
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
      autoHideDuration={4000} // 4秒で自動的に閉じる
      onClose={() => setSnackbarOpen(false)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // 表示位置
    >
      <Alert onClose={() => setSnackbarOpen(false)}
      severity="success"
      sx={{ width: '200%',
      fontSize: '1.1rem',
      alignItems: 'center',
      '& .MuiAlert-icon': {
        fontSize: '28px',}
      }}>
        登録が完了しました！
      </Alert>
    </Snackbar>
    </Box>
  );
};

export default MapRegisterPageLeaflet;