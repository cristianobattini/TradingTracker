import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { analysisApi } from 'src/services/analysis-api';
import { getAuthHeaders } from 'src/lib/client-config';
import { client } from 'src/client/client.gen';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  analysisId: number;
  onShared?: () => void;
}

const getBaseUrl = (): string => (client.getConfig().baseUrl as string) || '';

export function ShareDialog({ open, onClose, analysisId, onShared }: ShareDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [success, setSuccess] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setCurrentUserId(null);
      setUsers([]);
      setSelectedUsers([]);
      setSearchTerm('');
      setError('');
      setSuccess('');
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${getBaseUrl()}/api/users/me`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const user = await response.json();
          setCurrentUserId(user.id);
        }
      } catch {
        // Ignore error, current user filtering is not critical
      }
    };

    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${getBaseUrl()}/api/users/`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        const allUsers: User[] = await response.json();
        const filtered = allUsers
          .filter((user) => user.id !== currentUserId) // Exclude current user
          .filter((user) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
          );
        setUsers(filtered);
      } catch {
        setError('Failed to search users');
      } finally {
        setLoading(false);
      }
    };

    const initialize = async () => {
      await fetchCurrentUser();
      if (!searchTerm.trim()) {
        await fetchUsers();
      }
    };

    initialize();

    if (searchTerm.trim()) {
      const timer = setTimeout(fetchUsers, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, open, currentUserId]);

  const handleToggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    setSharing(true);
    setError('');
    setSuccess('');

    try {
      await analysisApi.share(analysisId, selectedUsers);
      setSuccess(`Analysis shared with ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      setSearchTerm('');
      setTimeout(() => {
        onClose();
        onShared?.();
      }, 1000);
    } catch {
      setError('Failed to share analysis. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Analysis</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <TextField
          fullWidth
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={sharing}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!loading && users.length > 0 && (
          <List
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              maxHeight: 300,
              overflow: 'auto',
            }}
          >
            {users.map((user) => (
              <ListItemButton
                key={user.id}
                onClick={() => handleToggleUser(user.id)}
                selected={selectedUsers.includes(user.id)}
              >
                <ListItemText
                  primary={user.username}
                  secondary={user.email}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {!loading && searchTerm && users.length === 0 && (
          <Alert severity="info">No users found</Alert>
        )}

        {selectedUsers.length > 0 && (
          <Box>
            <div style={{ fontSize: '0.875rem', marginBottom: 8, fontWeight: 500 }}>
              Selected users ({selectedUsers.length}):
            </div>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedUsers.map((userId) => {
                const user = users.find((u) => u.id === userId);
                return (
                  <Chip
                    key={userId}
                    label={user?.username || `User ${userId}`}
                    onDelete={() => handleToggleUser(userId)}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sharing}>
          Cancel
        </Button>
        <Button
          onClick={handleShare}
          variant="contained"
          startIcon={sharing ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          disabled={selectedUsers.length === 0 || sharing}
        >
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
}
