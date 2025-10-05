import React, { useState } from 'react';
import {
  Modal,
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import PropTypes from 'prop-types';
import { createUserUsersPost, RoleEnum } from 'src/client';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserCreated?: (user: any) => void;
  width?: number | string;
  initialCapital?: number;
  [key: string]: any;
}

const CreateUserModal = ({
  open,
  onClose,
  onUserCreated,
  width = 400,
  initialCapital = 1000,
  ...modalProps
}: CreateUserModalProps) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    initial_capital: initialCapital,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.username || !formData.email || !formData.password) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await createUserUsersPost({
        body: {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role as RoleEnum,
          initial_capital: formData.initial_capital,
        },
      });

      const newUser = response;

      if (onUserCreated) {
        onUserCreated(newUser);
      }

      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      initial_capital: initialCapital,
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="create-user-modal-title"
      {...modalProps}
    >
      <Box sx={{ ...modalStyle, width }}>
        <Typography id="create-user-modal-title" variant="h6" component="h2" gutterBottom>
          Create New User
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              required
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />

            <TextField
              required
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />

            <TextField
              required
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              disabled={loading}
              helperText="Password must be at least 6 characters long"
            />

            <FormControl fullWidth disabled={loading}>
              <InputLabel>Role</InputLabel>
              <Select name="role" value={formData.role} label="Role" onChange={handleChange}>
                <MenuItem value="user">User</MenuItem>
                {/* <MenuItem value="admin">Admin</MenuItem> */}
              </Select>
            </FormControl>

            <TextField
              label="Initial Capital"
              name="initial_capital"
              type="number"
              value={formData.initial_capital}
              onChange={handleChange}
              fullWidth
              disabled={loading}
              inputProps={{ min: 0, step: 100 }}
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={handleClose} disabled={loading} variant="outlined">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>
    </Modal>
  );
};

CreateUserModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUserCreated: PropTypes.func,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialCapital: PropTypes.number,
};

export default CreateUserModal;
