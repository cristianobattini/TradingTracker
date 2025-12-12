import React, { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  readUsersMeApiUsersMeGet,
  changeOwnPasswordApiUsersMeChangePasswordPost,
  updateUserApiUsersUserIdPut,
  UserResponse,
  UserUpdate,
  uploadAvatarApiUsersUserIdAvatarPost,
} from 'src/client';
import { Alert, Stack } from '@mui/material';
import { getLocalStorageItem } from 'src/services/local-storage-service';

import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { AccountAvatar } from 'src/layouts/components/account-avatar';

export function ProfileView() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formUser, setFormUser] = useState<Partial<UserResponse>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    readUsersMeApiUsersMeGet()
      .then((res) => {
        if (mounted) setUser(res.data || null);
      })
      .catch(() => setUser(null))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      setFormUser(user);
    }
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill all fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSubmitting(true);
    changeOwnPasswordApiUsersMeChangePasswordPost({
      body: { current_password: currentPassword, new_password: newPassword },
    })
      .then(() => {
        setMessage({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((err) => {
        console.error('Change password error', err);
        const text = err?.message || 'Failed to change password.';
        setMessage({ type: 'error', text });
      })
      .finally(() => setSubmitting(false));
  };

  const handleStartEdit = () => {
    setEditMode(true);
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFormUser(user || {});
    setMessage(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const body: UserUpdate = {
      username: formUser.username ?? undefined,
      email: formUser.email ?? undefined,
      role: formUser.role ?? undefined,
      initial_capital: formUser.initial_capital ?? undefined,
      valid: (formUser as any).valid ?? undefined,
    };

    setSubmitting(true);
    updateUserApiUsersUserIdPut({ path: { user_id: user.id }, body })
      .then((res) => {
        setMessage({ type: 'success', text: 'Profile updated successfully.' });
        setUser(res.data || null);
        setEditMode(false);
      })
      .catch((err) => {
        console.error('Update profile error', err);
        setMessage({ type: 'error', text: err?.message || 'Failed to update profile.' });
      })
      .finally(() => setSubmitting(false));
  };

  const handleSaveAvatar = async (avatarFileInput?: File) => {
    if (!user || !avatarFileInput) return;
    setAvatarUploading(true);
    setMessage(null);
    setAvatarFile(avatarFileInput)
    try {
      const res = await uploadAvatarApiUsersUserIdAvatarPost({ body: { file: avatarFileInput } });
      if (res.error) throw new Error(res.error.detail?.[0]?.msg || 'Failed to upload avatar');
      const newAvatar = (res.data as any)?.avatar;
      setFormUser((s) => ({ ...s, avatar: newAvatar }));
      setUser((u) => (u ? { ...u, avatar: newAvatar } : u));
      setMessage({ type: 'success', text: 'Avatar updated' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to upload avatar' });
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">My Profile</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Typography>Loading...</Typography>
            ) : user ? (
              <Stack spacing={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: "center", gap: 2, mt: 1 }}>
                  <label htmlFor="avatar-upload" style={{ cursor: "pointer" }}>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        // setAvatarFile(e.target.files ? e.target.files[0] : null)
                        handleSaveAvatar(e.target.files ? e.target.files[0] : undefined);
                      }}
                    />
                    <AccountAvatar size={200} avatarFile={avatarFile} />
                  </label>
                </Box>

                <Stack spacing={1}>

                  {!editMode && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" onClick={handleStartEdit}>
                        Edit Profile
                      </Button>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption">Username</Typography>
                    <TextField
                      value={formUser.username ?? ''}
                      onChange={(e) => setFormUser((s) => ({ ...s, username: e.target.value }))}
                      fullWidth
                      size="small"
                      disabled={!editMode}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption">Email</Typography>
                    <TextField
                      value={formUser.email ?? ''}
                      onChange={(e) => setFormUser((s) => ({ ...s, email: e.target.value }))}
                      fullWidth
                      size="small"
                      disabled={!editMode}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption">Role</Typography>
                    <TextField
                      value={String(formUser.role ?? '')}
                      onChange={(e) => setFormUser((s) => ({ ...s, role: e.target.value as any }))}
                      fullWidth
                      size="small"
                      disabled={true}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption">Initial capital</Typography>
                    <TextField
                      value={formUser.initial_capital ?? ''}
                      onChange={(e) =>
                        setFormUser((s) => ({ ...s, initial_capital: Number(e.target.value) }))
                      }
                      fullWidth
                      size="small"
                      disabled={!editMode}
                      sx={{ mt: 1 }}
                      type="number"
                    />
                  </Box>

                  {editMode && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveProfile}
                        disabled={submitting}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Stack>
              </Stack>
            ) : (
              <Typography color="text.secondary">User information not available.</Typography>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {message && (
              <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}

            <Box component="form" onSubmit={handleChangePassword} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  required
                />

                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  required
                />

                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                />

                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Change Password'}
                </Button>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

export default ProfileView;
