import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  MarkEmailRead as EmailIcon,
  Delete as DeleteIcon,
  Link as LinkIcon
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../lib/api/admin';
import type{ Database } from '../../types/supabase';
import { useNavigate } from 'react-router-dom';

type Invitation = {
  id: string;
  email: string;
  role: Database['public']['Enums']['user_role'];
  status: string;
  invited_by_email?: string;
  expires_at: string;
  created_at: string;
};

const AdminInvitation: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // フォーム用
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // 削除処理中のID管理用（ローディング表示のため）
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // 通知
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      navigate('/'); 
      return;
    }
    fetchInvitations();
  }, [user, isAdmin, authLoading, navigate]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      await adminApi.expireOldInvitations();
      const { data, error } = await adminApi.getInvitations();
      if (error) throw error;
      setInvitations((data as unknown as Invitation[]) || []);
    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: '招待リストの取得に失敗しました', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    try {
      const { error } = await adminApi.createInvitation(email, 'admin');
      if (error) throw error;

      setSnackbar({ open: true, message: `招待を作成しました: ${email}`, severity: 'success' });
      setEmail('');
      fetchInvitations();

    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: err.message || '招待に失敗しました', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- 追加: 削除ハンドラ ---
  const handleDelete = async (id: string, targetEmail: string) => {
    if (!window.confirm(`招待（${targetEmail}）をキャンセル・削除してもよろしいですか？`)) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await adminApi.deleteInvitation(id);
      if (error) throw error;

      setSnackbar({ open: true, message: '招待を削除しました', severity: 'success' });
      // リストから除外（再取得より高速）
      setInvitations(prev => prev.filter(inv => inv.id !== id));
    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: `削除失敗: ${err.message}`, severity: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'pending': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'メールアドレスをコピーしました', severity: 'success' });
  };


  const copyInviteLink = (targetEmail: string) => {
    // 現在のオリジン + /signup?email=xxx
    const inviteUrl = `${window.location.origin}/signup?email=${encodeURIComponent(targetEmail)}`;
    navigator.clipboard.writeText(inviteUrl);
    setSnackbar({ open: true, message: '招待リンクをコピーしました！相手に送信してください。', severity: 'success' });
  };

  if (authLoading) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Admin Invitations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          新しい管理者を招待します。
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* 左側: フォーム */}
        <Grid size={{ xs: 12, md:4 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon sx={{ mr: 1 }} color="primary" />
              新規招待
            </Typography>
            <Box component="form" onSubmit={handleInvite} sx={{ mt: 2 }}>
              <TextField
                label="メールアドレス"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                sx={{ mb: 2 }}
              />
              <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
                対象者はこのメールアドレスを使って「Sign Up」を行う必要があります。
              </Alert>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                disabled={submitting}
              >
                {submitting ? '送信中...' : '招待状を作成'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* 右側: リスト */}
        <Grid size={{ xs: 12, md:8 }}>
          <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
              <Typography variant="h6">招待履歴</Typography>
              <IconButton onClick={fetchInvitations} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>
            
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Action</TableCell> {/* アクション列追加 */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : invitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        招待履歴はありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations.map((inv) => (
                      <TableRow key={inv.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2">{inv.email}</Typography>
                            <Tooltip title="Copy">
                              <IconButton size="small" onClick={() => copyToClipboard(inv.email)}>
                                <CopyIcon fontSize="small" sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="招待リンクをコピー">
                                <IconButton size="small" onClick={() => copyInviteLink(inv.email)} color="primary">
                                <LinkIcon fontSize="small" sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={inv.status.toUpperCase()} 
                            size="small" 
                            color={getStatusColor(inv.status) as any}
                            variant={inv.status === 'pending' ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                          {new Date(inv.created_at).toLocaleDateString()}
                        </TableCell>
                        
                        {/* 削除ボタン列 */}
                        <TableCell align="center">
                          <Tooltip title="招待を削除">
                            <span>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleDelete(inv.id, inv.email)}
                                disabled={deletingId === inv.id} // 処理中は無効化
                              >
                                {deletingId === inv.id ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <DeleteIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>

                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminInvitation;