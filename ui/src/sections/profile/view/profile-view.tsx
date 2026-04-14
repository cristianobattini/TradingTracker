import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  readUsersMeApiUsersMeGet,
  changeOwnPasswordApiUsersMeChangePasswordPost,
  UserResponse,
  uploadAvatarApiUsersUserIdAvatarPost,
  importTradesApiTradesImportPost
} from 'src/client';
import { Alert, Stack } from '@mui/material';
import { getLocalStorageItem } from 'src/services/local-storage-service';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { AccountAvatar } from 'src/layouts/components/account-avatar';
import { getAuthHeaders } from 'src/lib/client-config';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export function ProfileView() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formUser, setFormUser] = useState<Partial<UserResponse>>({});
  // Use string for initial_capital to avoid losing trailing zeros/dots while typing
  const [initialCapitalStr, setInitialCapitalStr] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [importIssues, setImportIssues] = useState<{ row: number; missing_fields: string[]; conversion_errors: string[] }[]>([]);

  const loadUser = () => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    readUsersMeApiUsersMeGet()
      .then((res) => {
        if (mounted && res.data) {
          setUser(res.data);
        } else if (mounted) {
          setLoadError(true);
        }
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  };

  useEffect(() => {
    const cleanup = loadUser();
    return cleanup;
  }, []);

  useEffect(() => {
    if (user) {
      setFormUser(user);
      setInitialCapitalStr(String(user.initial_capital ?? ''));
    }
  }, [user]);

  const handleImportExcel = async (files: FileList | null) => {
    setImportMessage(null);
    setImportIssues([]);
    if (!files || files.length === 0) {
      setImportMessage({ type: 'error', text: 'Nessun file selezionato.' });
      return;
    }
    const file = files[0];
    importTradesApiTradesImportPost({ body: { file } })
      .then((res: any) => {
        setImportMessage({ type: 'success', text: `Importati ${res.data.imported} trade con successo.` });
        if (res.data.issues && res.data.issues.length > 0) {
          setImportIssues(res.data.issues);
        }
      })
      .catch((err) => {
        console.error('Import Excel error', err);
        setImportMessage({ type: 'error', text: err?.message || 'Impossibile importare il file Excel.' });
      });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Compila tutti i campi.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'La nuova password e la conferma non coincidono.' });
      return;
    }

    setSubmitting(true);
    changeOwnPasswordApiUsersMeChangePasswordPost({
      body: { current_password: currentPassword, new_password: newPassword },
    })
      .then(() => {
        setMessage({ type: 'success', text: 'Password modificata con successo.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((err) => {
        console.error('Change password error', err);
        const text = err?.message || 'Impossibile modificare la password.';
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
    setInitialCapitalStr(String(user?.initial_capital ?? ''));
    setMessage(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const parsedCapital = parseFloat(initialCapitalStr);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUser.username ?? undefined,
          email: formUser.email ?? undefined,
          initial_capital: isNaN(parsedCapital) ? undefined : parsedCapital,
          account_currency: formUser.account_currency ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Errore ${res.status}`);
      }
      const updated: UserResponse = await res.json();
      setMessage({ type: 'success', text: 'Profilo aggiornato con successo.' });
      setUser(updated);
      setEditMode(false);
    } catch (err: any) {
      console.error('Update profile error', err);
      setMessage({ type: 'error', text: err?.message || 'Impossibile aggiornare il profilo.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAvatar = async (avatarFileInput?: File) => {
    if (!user || !avatarFileInput) return;
    setAvatarUploading(true);
    setMessage(null);
    try {
      const res = await uploadAvatarApiUsersUserIdAvatarPost({ body: { file: avatarFileInput } });
      if (res.error) throw new Error((res.error as any)?.detail?.[0]?.msg || 'Impossibile caricare l\'avatar');
      const newAvatar = (res.data as any)?.avatar;
      setFormUser((s) => ({ ...s, avatar: newAvatar }));
      setUser((u) => (u ? { ...u, avatar: newAvatar } : u));
      setMessage({ type: 'success', text: 'Avatar aggiornato' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Impossibile caricare l\'avatar' });
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">Il Mio Profilo</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Informazioni Account
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {message && (
              <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}

            {loading ? (
              <Typography>Caricamento…</Typography>
            ) : loadError ? (
              <Box>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Impossibile caricare le informazioni utente. Controlla la connessione.
                </Typography>
                <Button variant="outlined" size="small" onClick={loadUser}>
                  Riprova
                </Button>
              </Box>
            ) : user ? (
              <Stack spacing={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 1 }}>
                  <label htmlFor="avatar-upload" style={{ cursor: 'pointer' }}>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        handleSaveAvatar(e.target.files ? e.target.files[0] : undefined);
                      }}
                    />
                    <AccountAvatar size={200} />
                  </label>
                </Box>

                <Stack spacing={1}>
                  {!editMode && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" onClick={handleStartEdit}>
                        Modifica Profilo
                      </Button>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption">Nome utente</Typography>
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
                    <Typography variant="caption">Ruolo</Typography>
                    <TextField
                      value={String(formUser.role ?? '')}
                      fullWidth
                      size="small"
                      disabled
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption">Capitale Iniziale</Typography>
                    <TextField
                      value={editMode ? initialCapitalStr : String(formUser.initial_capital ?? '')}
                      onChange={(e) => setInitialCapitalStr(e.target.value)}
                      fullWidth
                      size="small"
                      disabled={!editMode}
                      sx={{ mt: 1 }}
                      type={editMode ? 'text' : 'text'}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption">Valuta Account</Typography>
                    <TextField
                      select
                      value={formUser.account_currency ?? 'USD'}
                      onChange={(e) => setFormUser((s) => ({ ...s, account_currency: e.target.value }))}
                      fullWidth
                      size="small"
                      disabled={!editMode}
                      sx={{ mt: 1 }}
                    >
                      <MenuItem value="USD">USD - Dollaro USA</MenuItem>
                      <MenuItem value="EUR">EUR - Euro</MenuItem>
                      <MenuItem value="GBP">GBP - Sterlina britannica</MenuItem>
                      <MenuItem value="JPY">JPY - Yen giapponese</MenuItem>
                      <MenuItem value="CHF">CHF - Franco svizzero</MenuItem>
                      <MenuItem value="CAD">CAD - Dollaro canadese</MenuItem>
                      <MenuItem value="AUD">AUD - Dollaro australiano</MenuItem>
                      <MenuItem value="NZD">NZD - Dollaro neozelandese</MenuItem>
                      <MenuItem value="CNY">CNY - Yuan cinese</MenuItem>
                      <MenuItem value="INR">INR - Rupia indiana</MenuItem>
                    </TextField>
                  </Box>

                  {editMode && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveProfile}
                        disabled={submitting}
                      >
                        {submitting ? 'Salvataggio…' : 'Salva'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        Annulla
                      </Button>
                    </Box>
                  )}

                  {!editMode && (
                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Lingua</Typography>
                      <TextField
                        select
                        size="small"
                        value={i18n.language}
                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                        sx={{ minWidth: 150 }}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="it">Italiano</MenuItem>
                      </TextField>
                    </Box>
                  )}
                </Stack>
              </Stack>
            ) : (
              <Typography color="text.secondary">Informazioni utente non disponibili.</Typography>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cambia Password
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {message && message.type === 'error' && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}

            <Box component="form" onSubmit={handleChangePassword} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Password Attuale"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  required
                />

                <TextField
                  label="Nuova Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  required
                />

                <TextField
                  label="Conferma Nuova Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                />

                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Aggiornamento…' : 'Cambia Password'}
                </Button>
              </Stack>
            </Box>
          </Card>
          <Card sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Importa Excel
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {importMessage && (
              <Alert severity={importMessage.type} sx={{ mb: 2 }} onClose={() => setImportMessage(null)}>
                {importMessage.text}
              </Alert>
            )}

            {importIssues && importIssues.length > 0 && (
              <Card sx={{ mt: 2, mb: 2, p: 2, backgroundColor: '#fff3cd' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Alcuni campi mancavano o avevano errori di conversione:
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {importIssues.map((issue, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        Riga {issue.row}:{' '}
                        {issue.missing_fields.length > 0 && (
                          <>Mancanti: {issue.missing_fields.join(', ')}. </>
                        )}
                        {issue.conversion_errors.length > 0 && (
                          <>Errori di conversione: {issue.conversion_errors.join(', ')}</>
                        )}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Card>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                component="label"
                role={undefined}
                variant="contained"
                tabIndex={-1}
                startIcon={<CloudUploadIcon />}
              >
                Carica file
                <VisuallyHiddenInput
                  type="file"
                  onChange={(event: any) => handleImportExcel(event.target.files)}
                  multiple
                />
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

export default ProfileView;
