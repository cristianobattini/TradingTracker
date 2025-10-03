import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import { Snackbar } from '@mui/material';
import { loginLoginPost } from 'src/client';
import { setLocalStorageItem } from 'src/services/local-storage-service';

// ----------------------------------------------------------------------

export function SignInView() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(async (e: any) => {
    e.preventDefault(); // Prevent default form submission behavior
    
    console.log(username, password);
    const response = await loginLoginPost({
      body: {
        username: username,
        password: password
      }
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
      console.log(response);
    } else {
      setLocalStorageItem('accessToken', response.data.access_token);
      router.push('/');
    }
  }, [username, password, router]);

  function handleChangeUsername(e: any) {
    setUsername(e.target.value);
  }

  function handleChangePassword(e: any) {
    setPassword(e.target.value);
  }

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
        required 
      />

      <TextField
        fullWidth
        name="password"
        label="Password"
        placeholder='traderpwd!?'
        value={password}
        onChange={handleChangePassword}
        type={showPassword ? 'text' : 'password'}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
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
      >
        Sign in
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
        autoHideDuration={3000}
        onClose={() => setError('')}
        message={error}
      />
    </>
  );
}