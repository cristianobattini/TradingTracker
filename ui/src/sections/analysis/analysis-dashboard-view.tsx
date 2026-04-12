import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ArticleIcon from '@mui/icons-material/Article';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import dayjs from 'dayjs';

import { DashboardContent } from 'src/layouts/dashboard';
import { analysisApi, type Analysis } from 'src/services/analysis-api';
import { AnalysisDetailModal } from './analysis-detail-modal';

const PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
  'BTC/USD', 'ETH/USD', 'SPX500', 'NAS100', 'GOLD', 'OIL', 'Other',
];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

export function AnalysisDashboardView() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Analysis | null>(null);

  // Upload dialog state
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean;
    title: string;
    pair: string;
    timeframe: string;
    content: string;
    saving: boolean;
    error: string;
  }>({ open: false, title: '', pair: '', timeframe: '', content: '', saving: false, error: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analysisApi.list();
      setAnalyses(data);
    } catch {
      setError('Failed to load analyses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) ?? '';
      // derive title from filename: strip .md, replace separators with spaces, title-case
      const rawName = file.name.replace(/\.md$/i, '');
      const title = rawName
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setUploadDialog({ open: true, title, pair: '', timeframe: '', content, saving: false, error: '' });
    };
    reader.readAsText(file);
  };

  const handleUploadSave = async () => {
    if (!uploadDialog.title.trim()) {
      setUploadDialog((p) => ({ ...p, error: 'Title is required.' }));
      return;
    }
    setUploadDialog((p) => ({ ...p, saving: true, error: '' }));
    try {
      const created = await analysisApi.create({
        title: uploadDialog.title.trim(),
        pair: uploadDialog.pair || null,
        timeframe: uploadDialog.timeframe || null,
        content: uploadDialog.content,
      });
      setAnalyses((prev) => [created, ...prev]);
      setUploadDialog((p) => ({ ...p, open: false }));
    } catch {
      setUploadDialog((p) => ({ ...p, saving: false, error: 'Failed to save. Please try again.' }));
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = analyses.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.pair ?? '').toLowerCase().includes(q) ||
      (a.timeframe ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <DashboardContent>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Analysis Journal
        </Typography>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload .md
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/analysis/create')}
        >
          New Analysis
        </Button>
      </Box>

      {/* Search */}
      <TextField
        placeholder="Search by title, pair or timeframe…"
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, gap: 2, color: 'text.secondary' }}>
          <ArticleIcon sx={{ fontSize: 64, opacity: 0.3 }} />
          <Typography variant="body1">
            {search ? 'No analyses match your search.' : 'No analyses yet. Create your first one!'}
          </Typography>
          {!search && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/analysis/create')}>
              New Analysis
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((analysis) => (
            <Grid item key={analysis.id} xs={12} sm={6} md={4} lg={3}>
              <AnalysisCard
                analysis={analysis}
                onClick={() => setSelected(analysis)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detail modal */}
      {selected && (
        <AnalysisDetailModal
          analysis={selected}
          onClose={() => setSelected(null)}
          onDeleted={(id) => {
            setAnalyses((prev) => prev.filter((a) => a.id !== id));
            setSelected(null);
          }}
          onUpdated={(updated) => {
            setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setSelected(updated);
          }}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Upload confirm dialog */}
      <Dialog open={uploadDialog.open} onClose={() => setUploadDialog((p) => ({ ...p, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm analysis details</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {uploadDialog.error && <Alert severity="error">{uploadDialog.error}</Alert>}
          <TextField
            label="Title *"
            fullWidth
            size="small"
            value={uploadDialog.title}
            onChange={(e) => setUploadDialog((p) => ({ ...p, title: e.target.value }))}
          />
          <TextField
            label="Pair"
            select
            fullWidth
            size="small"
            value={uploadDialog.pair}
            onChange={(e) => setUploadDialog((p) => ({ ...p, pair: e.target.value }))}
          >
            <MenuItem value="">— None —</MenuItem>
            {PAIRS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField
            label="Timeframe"
            select
            fullWidth
            size="small"
            value={uploadDialog.timeframe}
            onChange={(e) => setUploadDialog((p) => ({ ...p, timeframe: e.target.value }))}
          >
            <MenuItem value="">— None —</MenuItem>
            {TIMEFRAMES.map((tf) => <MenuItem key={tf} value={tf}>{tf}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUploadSave}
            disabled={uploadDialog.saving}
            startIcon={uploadDialog.saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

// ── Card component ────────────────────────────────────────────────────────────

function AnalysisCard({ analysis, onClick }: { analysis: Analysis; onClick: () => void }) {
  const preview = analysis.content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/[#*`>_~\[\]]/g, '')
    .trim()
    .slice(0, 120);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ flex: 1, alignItems: 'flex-start', display: 'flex' }}>
        <CardContent sx={{ flex: 1, width: '100%' }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            gutterBottom
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {analysis.title}
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {dayjs(analysis.created_at).format('DD MMM YYYY')}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {analysis.pair && <Chip label={analysis.pair} size="small" color="primary" variant="outlined" />}
            {analysis.timeframe && <Chip label={analysis.timeframe} size="small" variant="outlined" />}
          </Box>

          {preview && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}
            >
              {preview}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
