import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import { Snackbar, Alert } from '@mui/material';
import { loginLoginPost } from 'src/client';
import { setLocalStorageItem } from 'src/services/local-storage-service';

export function SignInView() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Pass username and password as an object as expected by the API client
      const response = await loginLoginPost({
        body: {
          username,
          password,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.error) {
        const detail = response.error.detail;
        let errorMessage = "Login failed";
        
        if (Array.isArray(detail) && typeof detail[0] === "string") {
          errorMessage = detail[0];
        } else if (typeof detail === "string") {
          errorMessage = detail;
        }
        
        setError(errorMessage);
      } else {
        const token = response.data?.access_token;
        const role = response.data?.role;
        if (token) {
          setLocalStorageItem('accessToken', token);
          setLocalStorageItem('role', role || 'user');
          router.push('/');
        } else {
          setError('No access token received');
        }
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [username, password, router]);

  const handleChangeUsername = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (error) setError('');
  };

  const handleChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  const handleCloseError = () => {
    setError('');
  };

  const renderForm = (
    <Box
      component="form" 
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        flexDirection: 'column',
      }}
    >
      <TextField
        fullWidth
        name="username"
        label="Username"
        value={username}
        onChange={handleChangeUsername}
        placeholder="trader1234"
        sx={{ mb: 3 }}
        slotProps={{
          inputLabel: { shrink: true },
        }}
        disabled={isLoading}
        required 
      />

      <TextField
        fullWidth
        name="password"
        label="Password"
        placeholder="traderpwd!?"
        value={password}
        onChange={handleChangePassword}
        type={showPassword ? 'text' : 'password'}
        disabled={isLoading}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={() => setShowPassword(!showPassword)} 
                  edge="end"
                  disabled={isLoading}
                >
                  <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 3 }}
        required 
      />

      <Button
        fullWidth
        size="large"
        type="submit"
        color="inherit"
        variant="contained"
        disabled={isLoading}
        sx={{ 
          mb: 2,
          opacity: isLoading ? 0.7 : 1 
        }}
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          gap: 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 5,
        }}
      >
        <Typography variant="h5">Sign in</Typography>
      </Box>
      {renderForm}

      <Snackbar 
        open={error !== ''} 
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}