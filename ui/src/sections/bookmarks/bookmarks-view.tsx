import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import Skeleton from '@mui/material/Skeleton';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

import { DashboardContent } from 'src/layouts/dashboard';
import { getAuthHeaders } from 'src/lib/client-config';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FavoriteBookmark {
  id: number;
  title: string;
  url: string;
  description: string;
  color: string;
  emoji: string;
  sort_order: number;
  created_at: string;
  owner_id: number;
}

interface ReadLaterBookmark {
  id: number;
  title: string;
  summary: string;
  url: string;
  published_at: string | null;
  source: string;
  source_id: string;
  source_color: string;
  site_url: string;
  saved_at: string;
  expires_at: string | null;
  pinned: boolean;
  pin_order: number;
  owner_id: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ACCENT_COLORS = [
  '#4CAF50', '#2196F3', '#FF6B35', '#9C27B0',
  '#F44336', '#FF9800', '#00BCD4', '#E91E63',
];

const EMOJIS = ['🔖', '📌', '⭐', '💡', '📊', '📈', '💰', '🌐', '🔗', '📰', '🎯', '🛠️'];

const EXPIRY_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks (default)', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: 'Never', days: null },
];

const SORT_OPTIONS = [
  { value: 'saved_desc', label: 'Newest saved' },
  { value: 'saved_asc', label: 'Oldest saved' },
  { value: 'published_desc', label: 'Newest article' },
  { value: 'published_asc', label: 'Oldest article' },
  { value: 'source', label: 'Source A→Z' },
  { value: 'title', label: 'Title A→Z' },
  { value: 'expiry_asc', label: 'Expiring soon' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso || ''; }
}

function expiryLabel(expires_at: string | null): { text: string; color: 'error' | 'warning' | 'default' | 'success' } {
  if (!expires_at) return { text: 'Never expires', color: 'success' };
  const diff = new Date(expires_at).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return { text: 'Expired', color: 'error' };
  if (days <= 2) return { text: `Expires in ${days}d`, color: 'error' };
  if (days <= 7) return { text: `Expires in ${days}d`, color: 'warning' };
  return { text: `Expires in ${days}d`, color: 'default' };
}

const blankForm = () => ({ title: '', url: '', description: '', color: '#2196F3', emoji: '🔖' });

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---------------------------------------------------------------------------
// FavoriteCard — drag & drop
// ---------------------------------------------------------------------------
function FavoriteCard({
  bm, onEdit, onDelete, onDragStart, onDragOver, onDrop,
}: {
  bm: FavoriteBookmark;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); setOver(true); onDragOver(e); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); onDrop(e); }}
      variant="outlined"
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        outline: over ? `2px dashed ${bm.color}` : 'none',
        transition: 'box-shadow .2s, outline .1s',
        '&:hover': { boxShadow: 4 }, cursor: 'grab',
      }}
    >
      <CardContent sx={{ flex: 1, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: 18, mt: 0.3, flexShrink: 0 }} />
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
            bgcolor: bm.color + '22', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 18,
          }}>
            {bm.emoji}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap title={bm.title}>
              {bm.title}
            </Typography>
            <Typography variant="caption" color="text.disabled" noWrap title={bm.url} sx={{ display: 'block' }}>
              {bm.url}
            </Typography>
          </Box>
        </Box>
        {bm.description && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
            {bm.description}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button size="small" endIcon={<OpenInNewIcon fontSize="small" />}
          href={bm.url} target="_blank" rel="noopener noreferrer" sx={{ color: bm.color }}>
          Open
        </Button>
        <Box>
          <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" onClick={onDelete} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ReadLaterCard — supports pin + drag-and-drop when pinned
// ---------------------------------------------------------------------------
function ReadLaterCard({
  article, onDelete, onUpdateExpiry, onTogglePin,
  draggable: isDraggable, onDragStart, onDragOver, onDrop,
}: {
  article: ReadLaterBookmark;
  onDelete: () => void;
  onUpdateExpiry: (days: number | null) => void;
  onTogglePin: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [over, setOver] = useState(false);
  const expiry = expiryLabel(article.expires_at);

  return (
    <Card
      draggable={isDraggable}
      onDragStart={isDraggable ? onDragStart : undefined}
      onDragOver={isDraggable ? (e) => { e.preventDefault(); setOver(true); onDragOver?.(e); } : undefined}
      onDragLeave={isDraggable ? () => setOver(false) : undefined}
      onDrop={isDraggable ? (e) => { setOver(false); onDrop?.(e); } : undefined}
      variant="outlined"
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        outline: over ? '2px dashed' : 'none',
        outlineColor: over ? 'primary.main' : 'transparent',
        transition: 'box-shadow .2s, outline .1s',
        '&:hover': { boxShadow: 3 },
        ...(isDraggable && { cursor: 'grab' }),
        ...(article.pinned && { borderColor: 'primary.main', borderWidth: 1.5 }),
      }}
    >
      <CardContent sx={{ flex: 1, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          {isDraggable && (
            <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: 18, mt: 0.3, flexShrink: 0 }} />
          )}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
              {article.pinned && (
                <PushPinIcon sx={{ fontSize: 13, color: 'primary.main', transform: 'rotate(45deg)' }} />
              )}
              <Chip label={article.source} size="small" sx={{
                bgcolor: article.source_color + '22', color: article.source_color,
                fontWeight: 700, fontSize: '0.65rem',
              }} />
              {article.published_at && (
                <Typography variant="caption" color="text.disabled">
                  {formatDate(article.published_at)}
                </Typography>
              )}
            </Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {article.title}
            </Typography>
            {article.summary && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {article.summary}
              </Typography>
            )}
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {article.expires_at ? (
                <AccessTimeIcon sx={{ fontSize: 13, color: `${expiry.color}.main` }} />
              ) : (
                <AllInclusiveIcon sx={{ fontSize: 13, color: 'success.main' }} />
              )}
              <Chip label={expiry.text} color={expiry.color} size="small"
                sx={{ fontSize: '0.65rem', height: 18 }} />
              <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                · Saved {formatDate(article.saved_at)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button size="small" endIcon={<OpenInNewIcon fontSize="small" />}
          href={article.url} target="_blank" rel="noopener noreferrer">
          Read article
        </Button>
        <Box>
          <Tooltip title={article.pinned ? 'Unpin' : 'Pin to top'}>
            <IconButton size="small" onClick={onTogglePin} color={article.pinned ? 'primary' : 'default'}>
              {article.pinned
                ? <PushPinIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
                : <PushPinOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Options">
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton size="small" onClick={onDelete} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>

      {/* Options menu (expiry) */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
          Keep for…
        </Typography>
        {EXPIRY_OPTIONS.map((opt) => (
          <MenuItem
            key={String(opt.days)}
            selected={
              opt.days === null
                ? article.expires_at === null
                : article.expires_at !== null &&
                  Math.abs(new Date(article.expires_at).getTime() - (Date.now() + (opt.days ?? 0) * 86400000)) < 86400000 * 2
            }
            onClick={() => { onUpdateExpiry(opt.days); setMenuAnchor(null); }}
            dense
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export function BookmarksView() {
  const [tab, setTab] = useState(0);

  // Favorites
  const [favs, setFavs] = useState<FavoriteBookmark[]>([]);
  const [favsLoading, setFavsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const dragSrc = useRef<number | null>(null);

  // Read later
  const [readLater, setReadLater] = useState<ReadLaterBookmark[]>([]);
  const [rlLoading, setRlLoading] = useState(false);
  const [sortBy, setSortBy] = useState('saved_desc');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const dragPinSrc = useRef<number | null>(null);

  const [snackbar, setSnackbar] = useState('');
  const [error, setError] = useState('');

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------
  const loadFavs = useCallback(async () => {
    setFavsLoading(true);
    try {
      const data = await apiFetch('/api/bookmarks/favorites/');
      setFavs(data);
    } catch (e: any) { setError(e.message); }
    finally { setFavsLoading(false); }
  }, []);

  const loadReadLater = useCallback(async () => {
    setRlLoading(true);
    try {
      const data = await apiFetch('/api/bookmarks/read-later/');
      setReadLater(data);
    } catch (e: any) { setError(e.message); }
    finally { setRlLoading(false); }
  }, []);

  useEffect(() => { loadFavs(); }, [loadFavs]);
  useEffect(() => { loadReadLater(); }, [loadReadLater]);

  // ---------------------------------------------------------------------------
  // Favorites handlers
  // ---------------------------------------------------------------------------
  const openAdd = () => { setEditingId(null); setForm(blankForm()); setDialogOpen(true); };
  const openEdit = (bm: FavoriteBookmark) => {
    setEditingId(bm.id);
    setForm({ title: bm.title, url: bm.url, description: bm.description, color: bm.color, emoji: bm.emoji });
    setDialogOpen(true);
  };

  const handleSaveFav = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    const url = form.url.startsWith('http') ? form.url : 'https://' + form.url;
    setSaving(true);
    try {
      if (editingId !== null) {
        const updated = await apiFetch(`/api/bookmarks/favorites/${editingId}`, {
          method: 'PUT', body: JSON.stringify({ ...form, url }),
        });
        setFavs((prev) => prev.map((f) => f.id === editingId ? updated : f));
        setSnackbar('Bookmark updated');
      } else {
        const created = await apiFetch('/api/bookmarks/favorites/', {
          method: 'POST', body: JSON.stringify({ ...form, url }),
        });
        setFavs((prev) => [...prev, created]);
        setSnackbar('Bookmark added');
      }
      setDialogOpen(false);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteFav = async (id: number) => {
    try {
      await apiFetch(`/api/bookmarks/favorites/${id}`, { method: 'DELETE' });
      setFavs((prev) => prev.filter((f) => f.id !== id));
      setSnackbar('Bookmark removed');
    } catch (e: any) { setError(e.message); }
  };

  // Drag & drop reorder
  const handleDragStart = useCallback((index: number) => { dragSrc.current = index; }, []);

  const handleDrop = useCallback(async (index: number) => {
    if (dragSrc.current === null || dragSrc.current === index) return;
    const next = [...favs];
    const [moved] = next.splice(dragSrc.current, 1);
    next.splice(index, 0, moved);
    dragSrc.current = null;
    setFavs(next);
    try {
      await apiFetch('/api/bookmarks/favorites/reorder/', {
        method: 'PUT', body: JSON.stringify({ order: next.map((f) => f.id) }),
      });
    } catch (e: any) { setError(e.message); loadFavs(); }
  }, [favs, loadFavs]);

  // ---------------------------------------------------------------------------
  // Read Later handlers
  // ---------------------------------------------------------------------------
  const handleDeleteRL = async (id: number) => {
    try {
      await apiFetch(`/api/bookmarks/read-later/${id}`, { method: 'DELETE' });
      setReadLater((prev) => prev.filter((a) => a.id !== id));
      setSnackbar('Article removed');
    } catch (e: any) { setError(e.message); }
  };

  const handleUpdateExpiry = async (id: number, days: number | null) => {
    try {
      const updated = await apiFetch(`/api/bookmarks/read-later/${id}/expiry`, {
        method: 'PATCH', body: JSON.stringify({ expires_days: days }),
      });
      setReadLater((prev) => prev.map((a) => a.id === id ? updated : a));
      setSnackbar(days === null ? 'Set to never expire' : 'Expiry updated');
    } catch (e: any) { setError(e.message); }
  };

  const handleTogglePin = async (id: number) => {
    try {
      const updated = await apiFetch(`/api/bookmarks/read-later/${id}/pin`, { method: 'PATCH' });
      setReadLater((prev) => prev.map((a) => a.id === id ? updated : a));
      setSnackbar(updated.pinned ? 'Pinned to top' : 'Unpinned');
    } catch (e: any) { setError(e.message); }
  };

  const handleDropPinned = useCallback(async (toIndex: number) => {
    if (dragPinSrc.current === null || dragPinSrc.current === toIndex) return;
    const pinned = [...readLater]
      .filter((a) => a.pinned)
      .sort((a, b) => a.pin_order - b.pin_order);
    const [moved] = pinned.splice(dragPinSrc.current, 1);
    pinned.splice(toIndex, 0, moved);
    dragPinSrc.current = null;
    // Optimistic update
    setReadLater((prev) => prev.map((a) => {
      const idx = pinned.findIndex((p) => p.id === a.id);
      return idx !== -1 ? { ...a, pin_order: idx } : a;
    }));
    try {
      await apiFetch('/api/bookmarks/read-later/reorder/', {
        method: 'PUT', body: JSON.stringify({ order: pinned.map((p) => p.id) }),
      });
    } catch (e: any) { setError(e.message); loadReadLater(); }
  }, [readLater, loadReadLater]);

  // ---------------------------------------------------------------------------
  // Filtered / sorted read-later
  // ---------------------------------------------------------------------------
  const sourcesInRL = Array.from(new Set(readLater.map((a) => a.source_id)));

  const pinnedRL = [...readLater]
    .filter((a) => a.pinned)
    .sort((a, b) => a.pin_order - b.pin_order);

  const unpinnedRL = readLater
    .filter((a) => !a.pinned)
    .filter((a) => sourceFilter === 'all' || a.source_id === sourceFilter)
    .filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.summary?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'saved_asc': return a.saved_at.localeCompare(b.saved_at);
        case 'saved_desc': return b.saved_at.localeCompare(a.saved_at);
        case 'published_desc': return (b.published_at || '').localeCompare(a.published_at || '');
        case 'published_asc': return (a.published_at || '').localeCompare(b.published_at || '');
        case 'source': return a.source.localeCompare(b.source);
        case 'title': return a.title.localeCompare(b.title);
        case 'expiry_asc': {
          const ea = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const eb = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return ea - eb;
        }
        default: return 0;
      }
    });

  // ---------------------------------------------------------------------------
  // Skeleton loader
  // ---------------------------------------------------------------------------
  const CardSkeleton = () => (
    <Card variant="outlined" sx={{ height: 160 }}>
      <CardContent>
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1.5, mb: 1 }} />
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="50%" height={16} />
        <Skeleton variant="text" width="90%" height={14} sx={{ mt: 1 }} />
      </CardContent>
    </Card>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Bookmarks</Typography>
          <Typography variant="body2" color="text.secondary">
            Your favorite links and saved news articles — synced to your account
          </Typography>
        </Box>
        {tab === 0 && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Bookmark
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<BookmarkIcon fontSize="small" />} iconPosition="start" label={`Favorites (${favs.length})`} />
        <Tab icon={<BookmarkBorderIcon fontSize="small" />} iconPosition="start" label={`Read Later (${readLater.length})`} />
      </Tabs>

      {/* ===== TAB 0: FAVORITES ===== */}
      {tab === 0 && (
        favsLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}><CardSkeleton /></Grid>
            ))}
          </Grid>
        ) : favs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <BookmarkIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No bookmarks yet</Typography>
            <Typography variant="body2" color="text.disabled" mb={3}>
              Add your favorite links to access them quickly
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              Add your first bookmark
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="caption" color="text.disabled" sx={{ mb: 2, display: 'block' }}>
              Drag cards to reorder — order is saved automatically
            </Typography>
            <Grid container spacing={2}>
              {favs.map((bm, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={bm.id}>
                  <FavoriteCard
                    bm={bm}
                    onEdit={() => openEdit(bm)}
                    onDelete={() => handleDeleteFav(bm.id)}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; handleDragStart(i); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(i)}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )
      )}

      {/* ===== TAB 1: READ LATER ===== */}
      {tab === 1 && (
        <>
          {/* Filter bar */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search saved articles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Sort by</InputLabel>
              <Select value={sortBy} label="Sort by" onChange={(e) => setSortBy(e.target.value)}
                startAdornment={<SortIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label="All" onClick={() => setSourceFilter('all')}
                variant={sourceFilter === 'all' ? 'filled' : 'outlined'}
                color={sourceFilter === 'all' ? 'primary' : 'default'} size="small" />
              {sourcesInRL.map((src) => {
                const a = readLater.find((x) => x.source_id === src);
                return (
                  <Chip key={src} label={a?.source || src}
                    onClick={() => setSourceFilter(src === sourceFilter ? 'all' : src)}
                    variant={sourceFilter === src ? 'filled' : 'outlined'} size="small"
                    sx={sourceFilter === src
                      ? { bgcolor: a?.source_color, color: '#fff', borderColor: a?.source_color }
                      : { borderColor: a?.source_color, color: a?.source_color }}
                  />
                );
              })}
            </Box>

            <Box sx={{ ml: 'auto' }}>
              <Typography variant="caption" color="text.disabled">
                Articles expire automatically — change per-card with the ⋮ menu
              </Typography>
            </Box>
          </Box>

          {rlLoading ? (
            <Grid container spacing={2}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}><CardSkeleton /></Grid>
              ))}
            </Grid>
          ) : readLater.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <BookmarkBorderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>No saved articles yet</Typography>
              <Typography variant="body2" color="text.disabled">
                Click the bookmark icon on any news article to save it here for later
              </Typography>
            </Box>
          ) : (
            <>
              {/* Pinned section */}
              {pinnedRL.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <PushPinIcon sx={{ fontSize: 16, color: 'primary.main', transform: 'rotate(45deg)' }} />
                    <Typography variant="subtitle2" color="primary" fontWeight={700}>
                      Pinned ({pinnedRL.length})
                    </Typography>
                    <Typography variant="caption" color="text.disabled">— drag to reorder</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {pinnedRL.map((article, i) => (
                      <Grid item xs={12} sm={6} md={4} key={article.id}>
                        <ReadLaterCard
                          article={article}
                          onDelete={() => handleDeleteRL(article.id)}
                          onUpdateExpiry={(days) => handleUpdateExpiry(article.id, days)}
                          onTogglePin={() => handleTogglePin(article.id)}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; dragPinSrc.current = i; }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropPinned(i)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ mt: 3 }} />
                </Box>
              )}

              {/* Unpinned section */}
              {unpinnedRL.length === 0 && pinnedRL.length > 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 2 }}>
                  All articles are pinned
                </Typography>
              ) : unpinnedRL.length === 0 ? (
                <Alert severity="info">No articles match the current filters.</Alert>
              ) : (
                <>
                  {pinnedRL.length > 0 && (
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5 }}>
                      Other articles
                    </Typography>
                  )}
                  <Grid container spacing={2}>
                    {unpinnedRL.map((article) => (
                      <Grid item xs={12} sm={6} md={4} key={article.id}>
                        <ReadLaterCard
                          article={article}
                          onDelete={() => handleDeleteRL(article.id)}
                          onUpdateExpiry={(days) => handleUpdateExpiry(article.id, days)}
                          onTogglePin={() => handleTogglePin(article.id)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ===== ADD / EDIT DIALOG ===== */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId !== null ? 'Edit Bookmark' : 'Add Bookmark'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Icon</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                {EMOJIS.map((em) => (
                  <Box key={em} onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                    sx={{
                      width: 32, height: 32, borderRadius: 1, cursor: 'pointer', fontSize: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid', borderColor: form.emoji === em ? 'primary.main' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}>
                    {em}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Color</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 140 }}>
                {ACCENT_COLORS.map((c) => (
                  <Box key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                    sx={{
                      width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: '3px solid', borderColor: form.color === c ? 'text.primary' : 'transparent',
                      '&:hover': { transform: 'scale(1.15)' }, transition: 'transform .15s',
                    }} />
                ))}
              </Box>
            </Box>
          </Box>
          <TextField label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth required size="small" />
          <TextField label="URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            fullWidth required size="small" placeholder="https://…" />
          <TextField label="Description (optional)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            fullWidth size="small" multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveFav}
            disabled={!form.title.trim() || !form.url.trim() || saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}>
            {editingId !== null ? 'Save changes' : 'Add bookmark'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnackbar('')} variant="filled">{snackbar}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError('')} variant="filled">{error}</Alert>
      </Snackbar>
    </DashboardContent>
  );
}
