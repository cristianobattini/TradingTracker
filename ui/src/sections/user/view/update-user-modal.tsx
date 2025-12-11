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
import { createUserUsersPost, RoleEnum, updateUserUsersUserIdPut, UserUpdate } from 'src/client';

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

interface UpdateUserModalProps {
  open: boolean;
  user: UserUpdate;
  userId: number;
  onClose: () => void;
  onUserUpdated?: (user: any) => void;
  width?: number | string;
  initialCapital?: number;
  [key: string]: any;
}

const UpdateUserModal = ({
  open,
  user,
  userId,
  onClose,
  onUserUpdated,
  width = 400,
  initialCapital = 1000,
  ...modalProps
}: UpdateUserModalProps) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    role: user.role,
    initial_capital: user.initial_capital,
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
      if (!formData.username || !formData.email) {
        throw new Error('Please fill in all required fields');
      }

      const response = await updateUserUsersUserIdPut({
        path: { user_id: userId },
        body: {
          username: formData.username,
          email: formData.email,
          role: formData.role as RoleEnum,
          initial_capital: formData.initial_capital,
        },
      });

      const newUser = response;

      if (onUserUpdated) {
        onUserUpdated(newUser);
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
          Update {user.username}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form className='mt-2' onSubmit={handleSubmit}>
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
                {loading ? 'Saving...' : 'Save User'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>
    </Modal>
  );
};

UpdateUserModal.propTypes = {
  open: PropTypes.bool.isRequired,
  user: PropTypes.object.isRequired,
  userId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onUserUpdated: PropTypes.func,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialCapital: PropTypes.number,
};

export default UpdateUserModal;
