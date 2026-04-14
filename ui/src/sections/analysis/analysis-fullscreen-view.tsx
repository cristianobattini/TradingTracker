import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import TuneIcon from '@mui/icons-material/Tune';
import ShareIcon from '@mui/icons-material/Share';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';

import { analysisApi, type Analysis } from 'src/services/analysis-api';
import { ShareDialog } from './share-dialog';
import { readUsersMeApiUsersMeGet } from 'src/client/sdk.gen';

const PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
  'BTC/USD', 'ETH/USD', 'SPX500', 'NAS100', 'GOLD', 'OIL', 'Other',
];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

export function AnalysisFullscreenView() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  const handleImageClick = useCallback((src: string) => setZoomedSrc(src), []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    analysisApi
      .get(Number(id))
      .then(setAnalysis)
      .catch(() => setError(t('analysis.notFound')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadPdf = () => {
    if (!analysis) return;

    const contentEl = document.getElementById('analysis-print-content');
    if (!contentEl) return;

    const meta = [
      dayjs(analysis.created_at).format('DD MMM YYYY'),
      analysis.pair,
      analysis.timeframe,
    ]
      .filter(Boolean)
      .join(' · ');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${analysis.title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #111;
      max-width: 780px;
      margin: 0 auto;
      padding: 48px 40px;
    }
    .title { font-size: 2rem; font-weight: 700; margin-bottom: 6px; }
    .meta  { font-size: 0.8rem; color: #666; margin-bottom: 24px; }
    hr     { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
    h1 { font-size: 1.75rem; font-weight: 700; margin: 28px 0 12px; }
    h2 { font-size: 1.4rem;  font-weight: 600; margin: 24px 0 10px; }
    h3 { font-size: 1.15rem; font-weight: 600; margin: 20px 0 8px; }
    p  { margin-bottom: 14px; }
    ul, ol { padding-left: 24px; margin-bottom: 14px; }
    li { margin-bottom: 4px; }
    img { max-width: 100%; border-radius: 4px; display: block; margin: 16px 0; }
    pre {
      background: #f5f5f5;
      border-radius: 4px;
      padding: 14px;
      overflow-x: auto;
      margin-bottom: 14px;
      font-size: 0.85em;
    }
    code { font-family: 'Menlo', 'Courier New', monospace; font-size: 0.9em; background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 4px solid #1877F2;
      padding-left: 16px;
      color: #555;
      font-style: italic;
      margin: 0 0 14px;
    }
    table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    a { color: #1877F2; }
    @media print {
      body { padding: 0; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <div class="title">${analysis.title}</div>
  <div class="meta">${meta}</div>
  <hr />
  ${contentEl.innerHTML}
</body>
</html>`);

    printWindow.document.close();

    // Wait for images to finish loading before printing
    const images = printWindow.document.querySelectorAll('img');
    if (images.length === 0) {
      printWindow.focus();
      printWindow.print();
    } else {
      let loaded = 0;
      const tryPrint = () => {
        loaded += 1;
        if (loaded >= images.length) {
          printWindow.focus();
          printWindow.print();
        }
      };
      images.forEach((img) => {
        if (img.complete) tryPrint();
        else { img.onload = tryPrint; img.onerror = tryPrint; }
      });
    }
  };

  const handleRemoveShared = async () => {
    if (!analysis) return;
    
    try {
      // Get current user ID
      const userResponse = await readUsersMeApiUsersMeGet();
      if (!userResponse.data) return;
      await analysisApi.unshare(analysis.id, userResponse.data.id);
      navigate('/dashboard/analysis'); // Navigate back since analysis is no longer accessible
    } catch {
      // Handle error silently
    }
  };

  const handleDelete = async () => {
    if (!analysis) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await analysisApi.delete(analysis.id);
      navigate('/analysis');
    } catch {
      setDeleteError(t('analysis.deleteError'));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !analysis) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, gap: 2 }}>
        <Alert severity="error">{error || t('analysis.notFound')}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/analysis')}>{t('analysis.back')}</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title={t('analysis.title')}>
            <IconButton edge="start" onClick={() => navigate('/analysis')}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', py: 0.5 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
              {analysis.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {dayjs(analysis.created_at).format('DD MMM YYYY')}
            </Typography>
            {analysis.pair && <Chip label={analysis.pair} size="small" color="primary" variant="outlined" />}
            {analysis.timeframe && <Chip label={analysis.timeframe} size="small" variant="outlined" />}
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <Tooltip title={t('analysis.editContent')}>
              <IconButton onClick={() => navigate(`/analysis/${analysis.id}/edit`)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('analysis.editDetails')}>
              <IconButton onClick={() => setEditDetailsOpen(true)}>
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('analysis.shareWithUsers')}>
              <IconButton onClick={() => setShareDialogOpen(true)}>
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('analysis.exportMarkdown')}>
              <IconButton onClick={() => analysisApi.exportMarkdown(analysis)}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('analysis.downloadPdf')}>
              <IconButton onClick={handleDownloadPdf}>
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title={analysis?.is_shared ? t('analysis.removeShared') : t('analysis.deleteAnalysis')}>
              <IconButton color="error" onClick={analysis?.is_shared ? handleRemoveShared : () => setDeleteDialogOpen(true)}>
                {analysis?.is_shared ? <RemoveCircleIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box
        id="analysis-print-content"
        sx={{
          flex: 1,
          mx: 'auto',
          width: '100%',
          maxWidth: 860,
          px: { xs: 2, sm: 4 },
          py: 5,
          '& img': { maxWidth: '100%', borderRadius: 1 },
          '& pre': { bgcolor: 'action.hover', borderRadius: 1, p: 2, overflowX: 'auto' },
          '& code': { fontFamily: 'monospace', fontSize: '0.875em' },
          '& table': { borderCollapse: 'collapse', width: '100%', mb: 2 },
          '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 },
          '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            pl: 2,
            ml: 0,
            color: 'text.secondary',
            fontStyle: 'italic',
          },
          '& h1': { mt: 3, mb: 1.5, fontSize: '2rem', fontWeight: 700 },
          '& h2': { mt: 2.5, mb: 1, fontSize: '1.5rem', fontWeight: 600 },
          '& h3': { mt: 2, mb: 0.75, fontSize: '1.25rem', fontWeight: 600 },
          '& p': { lineHeight: 1.8, mb: 1.5 },
          '& ul, & ol': { pl: 3, mb: 1.5 },
          '& li': { mb: 0.5, lineHeight: 1.7 },
          '& hr': { my: 3, borderColor: 'divider' },
        }}
      >
        {analysis.content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => {
                const resolved = src?.startsWith('http') ? src : `${window.location.origin}${src}`;
                return (
                  <img
                    src={resolved}
                    alt={alt}
                    onClick={() => handleImageClick(resolved ?? '')}
                    style={{
                      maxWidth: '100%',
                      borderRadius: 4,
                      cursor: 'zoom-in',
                      display: 'block',
                      margin: '16px 0',
                    }}
                  />
                );
              },
            }}
          >
            {analysis.content}
          </ReactMarkdown>
        ) : (
          <Typography variant="body1" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            {t('analysis.noContent')}
          </Typography>
        )}

      {/* Image lightbox */}
      {zoomedSrc && (
        <Box
          onClick={() => setZoomedSrc(null)}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            bgcolor: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            p: 2,
          }}
        >
          <IconButton
            onClick={() => setZoomedSrc(null)}
            sx={{ position: 'absolute', top: 16, right: 16, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component="img"
            src={zoomedSrc}
            onClick={(e) => e.stopPropagation()}
            sx={{
              maxWidth: '95vw',
              maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: 2,
              boxShadow: 24,
              cursor: 'default',
            }}
          />
        </Box>
      )}
      </Box>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('analysis.deleteAnalysis')}</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert>}
          <Typography>
            {t('analysis.deleteConfirm', { title: analysis.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit details dialog */}
      {editDetailsOpen && (
        <EditDetailsDialog
          analysis={analysis}
          onClose={() => setEditDetailsOpen(false)}
          onSaved={(updated) => {
            setAnalysis(updated);
            setEditDetailsOpen(false);
          }}
        />
      )}

      {/* Share dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        analysisId={analysis.id}
        onShared={() => {
          // Optionally refresh the analysis to see the shares
          if (id) {
            analysisApi.get(Number(id)).then(setAnalysis);
          }
        }}
      />
    </Box>
  );
}

// ── Edit details sub-dialog ──────────────────────────────────────────────────

function EditDetailsDialog({
  analysis,
  onClose,
  onSaved,
}: {
  analysis: Analysis;
  onClose: () => void;
  onSaved: (a: Analysis) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(analysis.title);
  const [pair, setPair] = useState(analysis.pair ?? '');
  const [timeframe, setTimeframe] = useState(analysis.timeframe ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setError(t('analysis.titleRequired')); return; }
    setSaving(true);
    try {
      const updated = await analysisApi.update(analysis.id, {
        title: title.trim(),
        pair: pair || null,
        timeframe: timeframe || null,
      });
      onSaved(updated);
    } catch {
      setError(t('analysis.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('analysis.editDetails')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label={t('analysis.titleLabel')} fullWidth value={title} onChange={(e) => setTitle(e.target.value)} size="small" />
        <TextField label={t('analysis.pairLabel')} select fullWidth value={pair} onChange={(e) => setPair(e.target.value)} size="small">
          <MenuItem value="">{t('analysis.none')}</MenuItem>
          {PAIRS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField label={t('analysis.timeframeLabel')} select fullWidth value={timeframe} onChange={(e) => setTimeframe(e.target.value)} size="small">
          <MenuItem value="">{t('analysis.none')}</MenuItem>
          {TIMEFRAMES.map((tf) => <MenuItem key={tf} value={tf}>{tf}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {t('analysis.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
