import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ArticleIcon from '@mui/icons-material/Article';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
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

type SortKey = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc' | 'updated_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_desc',    label: 'Data ↓ (più recente)' },
  { value: 'date_asc',     label: 'Data ↑ (più vecchia)' },
  { value: 'updated_desc', label: 'Ultima modifica' },
  { value: 'title_asc',    label: 'Titolo A → Z' },
  { value: 'title_desc',   label: 'Titolo Z → A' },
];

export function AnalysisDashboardView() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Analysis | null>(null);

  // ── Filter & sort state ───────────────────────────────────────────────────
  const [search, setSearch]       = useState('');
  const [filterPair, setFilterPair]           = useState('');
  const [filterTimeframe, setFilterTimeframe] = useState('');
  const [sortKey, setSortKey]     = useState<SortKey>('date_desc');

  // Upload dialog state
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean; title: string; pair: string; timeframe: string; content: string; saving: boolean; error: string;
  }>({ open: false, title: '', pair: '', timeframe: '', content: '', saving: false, error: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAnalyses(await analysisApi.list());
    } catch {
      setError('Caricamento fallito.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Dynamic pair / timeframe lists (only values present in data) ──────────
  const availablePairs = useMemo(() => {
    const s = new Set(analyses.map((a) => a.pair).filter(Boolean) as string[]);
    return PAIRS.filter((p) => s.has(p));
  }, [analyses]);

  const availableTimeframes = useMemo(() => {
    const s = new Set(analyses.map((a) => a.timeframe).filter(Boolean) as string[]);
    return TIMEFRAMES.filter((tf) => s.has(tf));
  }, [analyses]);

  const hasActiveFilters = search || filterPair || filterTimeframe;

  const resetFilters = () => {
    setSearch('');
    setFilterPair('');
    setFilterTimeframe('');
  };

  // ── Filter + sort pipeline ────────────────────────────────────────────────
  const result = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = analyses.filter((a) => {
      if (filterPair && a.pair !== filterPair) return false;
      if (filterTimeframe && a.timeframe !== filterTimeframe) return false;
      if (q && !a.title.toLowerCase().includes(q) &&
               !(a.pair ?? '').toLowerCase().includes(q) &&
               !(a.timeframe ?? '').toLowerCase().includes(q)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [analyses, search, filterPair, filterTimeframe, sortKey]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) ?? '';
      const title = file.name.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      setUploadDialog({ open: true, title, pair: '', timeframe: '', content, saving: false, error: '' });
    };
    reader.readAsText(file);
  };

  const handleUploadSave = async () => {
    if (!uploadDialog.title.trim()) {
      setUploadDialog((p) => ({ ...p, error: 'Il titolo è obbligatorio.' }));
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
      setUploadDialog((p) => ({ ...p, saving: false, error: 'Salvataggio fallito.' }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Analysis Journal
        </Typography>
        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
          Upload .md
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/analysis/create')}>
          Nuova analisi
        </Button>
      </Box>

      {/* Search + sort row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Cerca per titolo, coppia o timeframe…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: '1 1 220px', maxWidth: 380 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* Filter: pair */}
        <TextField
          select
          label="Coppia"
          size="small"
          value={filterPair}
          onChange={(e) => setFilterPair(e.target.value)}
          sx={{ minWidth: 130 }}
          disabled={availablePairs.length === 0}
        >
          <MenuItem value="">Tutte le coppie</MenuItem>
          {availablePairs.map((p) => (
            <MenuItem key={p} value={p}>{p}</MenuItem>
          ))}
        </TextField>

        {/* Filter: timeframe */}
        <TextField
          select
          label="Timeframe"
          size="small"
          value={filterTimeframe}
          onChange={(e) => setFilterTimeframe(e.target.value)}
          sx={{ minWidth: 130 }}
          disabled={availableTimeframes.length === 0}
        >
          <MenuItem value="">Tutti i TF</MenuItem>
          {availableTimeframes.map((tf) => (
            <MenuItem key={tf} value={tf}>{tf}</MenuItem>
          ))}
        </TextField>

        {/* Sort */}
        <TextField
          select
          label="Ordina per"
          size="small"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          sx={{ minWidth: 190 }}
        >
          {SORT_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>

        {/* Reset filters button */}
        {hasActiveFilters && (
          <Tooltip title="Azzera filtri">
            <IconButton size="small" onClick={resetFilters} color="default">
              <FilterListOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {search && (
            <Chip size="small" label={`"${search}"`} onDelete={() => setSearch('')} />
          )}
          {filterPair && (
            <Chip size="small" label={filterPair} color="primary" variant="outlined" onDelete={() => setFilterPair('')} />
          )}
          {filterTimeframe && (
            <Chip size="small" label={filterTimeframe} variant="outlined" onDelete={() => setFilterTimeframe('')} />
          )}
          <Chip size="small" label={`${result.length} risultat${result.length === 1 ? 'o' : 'i'}`} variant="filled" />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : result.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, gap: 2, color: 'text.secondary' }}>
          <ArticleIcon sx={{ fontSize: 64, opacity: 0.3 }} />
          <Typography variant="body1">
            {hasActiveFilters ? 'Nessuna analisi corrisponde ai filtri.' : 'Nessuna analisi ancora. Creane una!'}
          </Typography>
          {hasActiveFilters ? (
            <Button variant="outlined" startIcon={<FilterListOffIcon />} onClick={resetFilters}>
              Azzera filtri
            </Button>
          ) : (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/analysis/create')}>
              Nuova analisi
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {result.map((analysis) => (
            <Grid item key={analysis.id} xs={12} sm={6} md={4} lg={3}>
              <AnalysisCard analysis={analysis} onClick={() => setSelected(analysis)} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detail modal */}
      {selected && (
        <AnalysisDetailModal
          analysis={selected}
          onClose={() => setSelected(null)}
          onDeleted={(id) => { setAnalyses((prev) => prev.filter((a) => a.id !== id)); setSelected(null); }}
          onUpdated={(updated) => { setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a))); setSelected(updated); }}
        />
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".md,text/markdown" style={{ display: 'none' }} onChange={handleFileSelect} />

      {/* Upload dialog */}
      <Dialog open={uploadDialog.open} onClose={() => setUploadDialog((p) => ({ ...p, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>Dettagli analisi</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {uploadDialog.error && <Alert severity="error">{uploadDialog.error}</Alert>}
          <TextField label="Titolo *" fullWidth size="small" value={uploadDialog.title}
            onChange={(e) => setUploadDialog((p) => ({ ...p, title: e.target.value }))} />
          <TextField label="Coppia" select fullWidth size="small" value={uploadDialog.pair}
            onChange={(e) => setUploadDialog((p) => ({ ...p, pair: e.target.value }))}>
            <MenuItem value="">— Nessuna —</MenuItem>
            {PAIRS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField label="Timeframe" select fullWidth size="small" value={uploadDialog.timeframe}
            onChange={(e) => setUploadDialog((p) => ({ ...p, timeframe: e.target.value }))}>
            <MenuItem value="">— Nessuno —</MenuItem>
            {TIMEFRAMES.map((tf) => <MenuItem key={tf} value={tf}>{tf}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog((p) => ({ ...p, open: false }))}>Annulla</Button>
          <Button variant="contained" onClick={handleUploadSave} disabled={uploadDialog.saving}
            startIcon={uploadDialog.saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function AnalysisCard({ analysis, onClick }: { analysis: Analysis; onClick: () => void }) {
  const preview = analysis.content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/[#*`>_~\[\]]/g, '')
    .trim()
    .slice(0, 120);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
      <CardActionArea onClick={onClick} sx={{ flex: 1, alignItems: 'flex-start', display: 'flex' }}>
        <CardContent sx={{ flex: 1, width: '100%' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
            <Typography variant="body2" color="text.secondary"
              sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
              {preview}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
