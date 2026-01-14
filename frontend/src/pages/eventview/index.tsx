import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Fab,
  Snackbar,
  Alert,
  Skeleton,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Place as PlaceIcon
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { eventsApi } from '../../lib/api/events';
import { storageApi } from '../../lib/api/storage';
import type{ Database } from '../../types/supabase';
import EventRegistrationForm from '../../components/eventregistrationform';

type Event = Database['public']['Tables']['events']['Row'];

const EventView: React.FC = () => {
  const { user, isAdmin } = useAuth();

  // データ
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // UI制御
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // フォーム用
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 通知
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: eventsData } = await eventsApi.getAll();
      setEvents(eventsData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // --- ハンドラ ---

  // 詳細表示
  const handleOpenDetail = async (event: Event) => {
    try {
      const { data, error } = await eventsApi.getEventWithSpots(event.id);
      if (error) throw error;
      setSelectedEvent(data);
      setOpenDetail(true);
    } catch (e) {
      console.error(e);
    }
  };

  // 新規作成フォームを開く
  const handleOpenCreate = () => {
    setSelectedEvent(null);
    setImageFile(null);
    setImagePreview(null);
    setIsEditMode(false);
    setOpenForm(true);
  };

  // 編集フォームを開く
  const handleOpenEdit = async (event: Event) => {
    try {
      const { data } = await eventsApi.getEventWithSpots(event.id);
      setSelectedEvent(data);
      setImageFile(null);
      setImagePreview(data?.image_url || null);
      setIsEditMode(true);
      setOpenForm(true);
    } catch (e) {
      console.error(e);
    }
  };

  // 削除ハンドラ (フォームに渡す)
  const handleDelete = async () => {
    // selectedEvent がある前提
    if (!selectedEvent) return;

    if (!window.confirm(`イベント「${selectedEvent.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await eventsApi.delete(selectedEvent.id);
      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setSnackbar({ open: true, message: 'イベントを削除しました', severity: 'success' });
      setOpenForm(false); // フォームを閉じる
      
    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: `削除に失敗しました: ${err.message}`, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // 画像処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 保存処理
  const handleSubmit = async (formData: any, spotIds: string[]) => {
    try {
      setSubmitting(true);
      let imageUrl = isEditMode ? selectedEvent.image_url : null;

      if (imageFile) {
        setIsUploading(true);
        imageUrl = await storageApi.uploadEventImage(imageFile); 
        setIsUploading(false);
      }

      const eventData = {
        ...formData,
        image_url: imageUrl,
        created_by_user: user?.id
      };

      let savedEventId;

      if (isEditMode && selectedEvent) {
        const { error } = await eventsApi.update(selectedEvent.id, eventData);
        if (error) throw error;
        savedEventId = selectedEvent.id;
        setSnackbar({ open: true, message: 'イベントを更新しました', severity: 'success' });
      } else {
        const { data, error } = await eventsApi.create(eventData);
        if (error) throw error;
        savedEventId = data.id;
        setSnackbar({ open: true, message: 'イベントを作成しました', severity: 'success' });
      }

      if (savedEventId) {
        await eventsApi.updateEventSpots(savedEventId, spotIds);
      }

      setOpenForm(false);
      fetchData(); 

    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: `エラーが発生しました: ${err.message}`, severity: 'error' });
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">イベント一覧</Typography>
        {isAdmin && (
          <Fab color="primary" variant="extended" onClick={handleOpenCreate}>
            <AddIcon sx={{ mr: 1 }} />
            イベント作成
          </Fab>
        )}
      </Box>

      <Grid container spacing={3}>
        {loading ? (
           Array.from(new Array(3)).map((_, i) => (
             <Grid key={i} size = {{ xs:12, md:4}}><Skeleton variant="rectangular" height={200} /></Grid>
           ))
        ) : events.map((event) => {
          return (
            <Grid key={event.id} size = {{ xs:12, md:4}}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={event.image_url || 'https://via.placeholder.com/300?text=Event'}
                  alt={event.name}
                  sx={{ bgcolor: 'grey.200', objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>{event.name}</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={event.is_public ? '公開中' : '非公開'} 
                      color={event.is_public ? 'success' : 'default'} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                    {event.description}
                  </Typography>
                </CardContent>
                
                {/* アクションボタン */}
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button size="small" onClick={() => handleOpenDetail(event)}>
                    詳細
                  </Button>
                  
                  {isAdmin && (
                    <Button size="small" color="primary" variant="outlined" onClick={() => handleOpenEdit(event)}>
                      編集
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* イベント作成・編集ダイアログ */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEditMode ? 'イベント編集' : 'イベント作成'}</DialogTitle>
        <DialogContent dividers>
          <EventRegistrationForm
            initialData={selectedEvent}
            isEditMode={isEditMode}
            submitting={submitting}
            isUploading={isUploading}
            onSubmit={handleSubmit}
            onDelete={handleDelete} // 削除ハンドラを渡す
            onImageChange={handleImageChange}
            imagePreview={imagePreview}
            fileInputRef={fileInputRef}
          />
        </DialogContent>
      </Dialog>

      {/* イベント詳細ダイアログ */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        {selectedEvent && (
          <>
            <DialogTitle>
              {selectedEvent.name}
              {selectedEvent.organizer && (
                <Typography variant="subtitle2" color="text.secondary">主催: {selectedEvent.organizer}</Typography>
              )}
            </DialogTitle>
            <DialogContent dividers>
              {selectedEvent.image_url && (
                <Box component="img" src={selectedEvent.image_url} sx={{ width: '100%', borderRadius: 1, mb: 2 }} />
              )}
              <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {selectedEvent.description}
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                <PlaceIcon sx={{ mr: 1 }} /> 対象スポット
              </Typography>
              
              <Stack spacing={1}>
                {selectedEvent.event_spot?.map((es: any, index: number) => (
                   <Box key={es.spots.id} sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid #eee' }}>
                     <Box sx={{ 
                       width: 24, height: 24, borderRadius: '50%', 
                       bgcolor: 'primary.main', color: 'white', 
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       mr: 2, fontSize: '0.8rem'
                     }}>
                       {index + 1}
                     </Box>
                     <Box>
                       <Typography variant="subtitle2">{es.spots.name}</Typography>
                       <Typography variant="caption" color="text.secondary">{es.spots.address}</Typography>
                     </Box>
                   </Box>
                ))}
              </Stack>
            </DialogContent>
            <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
              <Button onClick={() => setOpenDetail(false)}>閉じる</Button>
            </CardActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default EventView;