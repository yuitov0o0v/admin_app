import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { profileApi } from '../../lib/api/profile';
import type{ Database } from '../../types/supabase';

// 型定義
type UserProfile = Database['public']['Tables']['user_profile']['Row'];

// 性別のマッピング (DBがintegerなので)
const GENDER_OPTIONS = [
  { value: 0, label: '未回答' },
  { value: 1, label: '男性' },
  { value: 2, label: '女性' },
  { value: 9, label: 'その他' },
];

const Setting: React.FC = () => {
  const { user, role, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // フォームデータ
  const [username, setUsername] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<number>(0);

  // 通知
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // データ取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await profileApi.getMyProfile(user.id);
        
        if (error) {
          // プロフィールが存在しない場合（通常はトリガーで作られるが念のため）
          if (error.code === 'PGRST116') {
             console.log('Profile not found, waiting for trigger or manual creation');
          } else {
             throw error;
          }
        }

        if (data) {
          setProfile(data);
          // フォーム初期値設定
          setUsername(data.username || '');
          setAddress(data.address || '');
          setBirthDate(data.birth_date || '');
          setGender(data.gender || 0);
        }
      } catch (err: any) {
        console.error('Failed to fetch profile:', err);
        setSnackbar({ open: true, message: 'プロフィールの取得に失敗しました', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  // 更新保存
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      
      const updates = {
        username,
        address,
        birth_date: birthDate || null,
        gender,
        updated_at: new Date().toISOString(),
      };

      const { error } = await profileApi.updateProfile(user.id, updates);

      if (error) throw error;

      setSnackbar({ open: true, message: 'プロフィールを更新しました', severity: 'success' });
      
    } catch (err: any) {
      console.error('Update failed:', err);
      setSnackbar({ open: true, message: `更新失敗: ${err.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
        Account Settings
      </Typography>

      <Grid container spacing={3}>
        {/* --- 左側: プロフィール概要カード --- */}
        <Grid size={{ xs: 12, md:4 }}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Avatar 
                sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: '3rem' }}
              >
                {username ? username.charAt(0).toUpperCase() : <PersonIcon fontSize="inherit" />}
              </Avatar>
            </Box>
            
            <Typography variant="h6" gutterBottom>
              {username || 'No Name'}
            </Typography>
            
            <Chip 
              icon={role === 'admin' ? <AdminIcon /> : <BadgeIcon />} 
              label={role === 'admin' ? 'Administrator' : 'General User'} 
              color={role === 'admin' ? 'error' : 'default'}
              variant="outlined"
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {user?.email}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" display="block" color="text.secondary">
              User ID:
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {user?.id}
            </Typography>
          </Paper>
        </Grid>

        {/* --- 右側: 編集フォーム --- */}
        <Grid size={{ xs: 12, md:8 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Edit Profile
            </Typography>
            
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                  <TextField
                    label="ユーザー名"
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    helperText="アプリ内で表示される名前です"
                  />
                </Grid>

                <Grid size={{ xs: 12}}>
                  <TextField
                    label="メールアドレス"
                    fullWidth
                    value={user?.email || ''}
                    disabled
                    helperText="メールアドレスの変更はできません"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm:6 }}>
                  <FormControl fullWidth>
                    <InputLabel>性別</InputLabel>
                    <Select
                      value={gender}
                      label="性別"
                      onChange={(e) => setGender(Number(e.target.value))}
                    >
                      {GENDER_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm:6 }}>
                  <TextField
                    label="生年月日"
                    type="date"
                    fullWidth
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12}}>
                  <TextField
                    label="住所"
                    fullWidth
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="都道府県・市区町村"
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      type="submit" 
                      size="large"
                      startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Setting;