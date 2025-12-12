import React, { useState, useEffect } from 'react'; // useEffect追加
import { Link as RouterLink, useLocation } from 'react-router-dom'; // useLocation追加
import { authApi } from '../../lib/api/auth';
import { adminApi } from '../../lib/api/admin'; // 追加
import {
  Box,
  Paper,
  Avatar,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Link,
  Button,
  CircularProgress
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';

const Signup: React.FC = () => {
  // URLパラメータからメールアドレスを取得
  const location = useLocation();
  const getInitialEmail = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('email') || '';
  };

  const [email, setEmail] = useState(getInitialEmail());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // URLパラメータが変わった場合も反映（念のため）
  useEffect(() => {
    const emailFromUrl = getInitialEmail();
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 1. 入力バリデーション
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    setLoading(true);

    try {
      // 2. 招待の有効性チェック (ここが追加機能)
      const checkRes = await adminApi.checkInvitation(email);
      
      // checkRes.data は { valid: boolean, message: string, ... } の形
      // 型定義によっては data が any になることがあるためキャストするか確認が必要
      const inviteData = checkRes.data as any; 

      if (!inviteData || !inviteData.valid) {
        throw new Error('このメールアドレスは招待されていません。管理者から招待を受けてください。');
      }

      // 3. アカウント作成 (招待OKなら実行)
      const { error: signUpError } = await authApi.signUp(email, password);
      
      if (signUpError) {
        throw signUpError;
      }

      setSuccess('アカウント登録が完了しました。確認メールを送信しましたので、メール内のリンクをクリックして登録を完了させてください。');
    } catch (err: any) {
      setError(err.message || 'アカウント作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 450,
          width: '100%',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: '#2e7d32' }}>
          <PersonAddIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          アカウント作成
        </Typography>
        
        {/* 招待制であることを明示 */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          ※登録には管理者からの招待が必要です
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <Stack spacing={2}>
            <TextField
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoFocus
              // URLから来た場合は分かりやすくするためにReadonlyにしても良いが、
              // 間違っていた場合に修正できるよう今回は通常入力のままにします
            />
            <TextField
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              helperText="8文字以上で入力してください"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="パスワード確認"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              error={confirmPassword !== '' && password !== confirmPassword}
              helperText={
                confirmPassword !== '' && password !== confirmPassword
                  ? 'パスワードが一致しません'
                  : ''
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {error && (
              <Alert
                severity="error"
                sx={{
                  '& .MuiAlert-message': {
                    fontSize: '0.875rem',
                    lineHeight: 1.4
                  }
                }}
              >
                {error}
              </Alert>
            )}
            {success && (
              <Alert
                severity="success"
                sx={{
                  '& .MuiAlert-message': {
                    fontSize: '0.875rem',
                    lineHeight: 1.4
                  }
                }}
              >
                {success}
                <Box sx={{ mt: 1 }}>
                  <Link component={RouterLink} to="/login" variant="body2">
                    ログインページはこちら →
                  </Link>
                </Box>
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 2,
                mb: 2,
                position: 'relative',
                bgcolor: '#2e7d32',
                '&:hover': { bgcolor: '#1b5e20' }
              }}
            >
              {loading && (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                  }}
                />
              )}
              アカウント作成
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                既にアカウントをお持ちの方は{' '}
                <Link component={RouterLink} to="/login" variant="body2">
                  こちら
                </Link>
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default Signup;