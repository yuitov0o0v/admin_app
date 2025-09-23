import React, { useState, useContext } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// Material-UI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';

// Material-UI Icons
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';

const Signup: React.FC = () => {
  const { signUp } = useContext(AuthContext)!;
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // パスワード確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      setLoading(false);
      return;
    }

    // パスワード強度チェック
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(email, password);

      // Supabaseは既存メールでも成功レスポンスを返すため、
      // 単純に確認メールの案内を表示
      if (result.user) {
        setSuccess('確認メールを送信しました。メールボックスをご確認ください。既にアカウントをお持ちの場合は、ログインページからサインインしてください。');
      } else {
        setSuccess('確認メールを送信しました。メールボックスをご確認ください。');
      }
    } catch (err: any) {
      // 実際のエラー（パスワード要件、ネットワークエラーなど）のみ処理
      let errorMessage = 'アカウント作成中にエラーが発生しました。';

      if (err.message?.includes('Password should be at least')) {
        errorMessage = 'パスワードは8文字以上で設定してください。';
      } else if (err.message?.includes('Invalid email')) {
        errorMessage = '無効なメールアドレス形式です。正しいメールアドレスを入力してください。';
      } else if (err.message?.includes('password')) {
        errorMessage = 'パスワードの要件を満たしていません。';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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