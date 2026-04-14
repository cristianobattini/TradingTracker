import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import TuneIcon from '@mui/icons-material/Tune';
import ShareIcon from '@mui/icons-material/Share';
import { ShareDialog } from './share-dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import { getAuthHeaders } from 'src/lib/client-config';
import { client } from 'src/client/client.gen';
import { readUsersMeApiUsersMeGet } from 'src/client/sdk.gen';

import { analysisApi, type Analysis } from 'src/services/analysis-api';

const PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
  'BTC/USD', 'ETH/USD', 'SPX500', 'NAS100', 'GOLD', 'OIL', 'Other',
];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

interface Props {
  analysis: Analysis | null;
  onClose: () => void;
  onDeleted: (id: number) => void;
  onUpdated: (analysis: Analysis) => void;
}

export function AnalysisDetailModal({ analysis, onClose, onDeleted, onUpdated }: Props) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [shareSnackbar, setShareSnackbar] = useState<string>('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const handleShareToClipboard = async () => {
    if (!analysis) return;
    const meta = [analysis.pair, analysis.timeframe, dayjs(analysis.created_at).format('DD MMM YYYY')]
      .filter(Boolean)
      .join(' · ');
    const shareText = `# ${analysis.title}\n${meta}\n\n${analysis.content}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: analysis.title, text: shareText });
        return;
      } catch {
        // user cancelled or not supported, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShareSnackbar('Analisi copiata negli appunti!');
    } catch {
      setShareSnackbar('Impossibile copiare — prova a esportare in PDF.');
    }
  };

  const handleShareWithUsers = () => {
    setShareDialogOpen(true);
  };

  const handleShareSuccess = async () => {
    // Reload the analysis to get updated shares
    try {
      const updated = await analysisApi.get(analysis!.id);
      onUpdated(updated);
    } catch {
      // Handle error silently
    }
  };

  const handleRemoveShared = async () => {
    if (!analysis) return;
    
    try {
      // Get current user ID
      const userResponse = await readUsersMeApiUsersMeGet();
      if (!userResponse.data) return;
      await analysisApi.unshare(analysis.id, userResponse.data.id);
      onClose(); // Close modal since analysis is no longer accessible
    } catch {
      // Handle error silently
    }
  };

  if (!analysis) return null;

  const handleEdit = () => {
    navigate(`/analysis/${analysis.id}/edit`);
  };

  const handleFullscreen = () => {
    navigate(`/analysis/${analysis.id}`);
  };

  const handleDownloadPdf = () => {
    const contentEl = document.getElementById('modal-print-content');
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.7; color: #111; max-width: 780px; margin: 0 auto; padding: 48px 40px; }
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
    pre { background: #f5f5f5; border-radius: 4px; padding: 14px; overflow-x: auto; margin-bottom: 14px; font-size: 0.85em; }
    code { font-family: monospace; font-size: 0.9em; background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #1877F2; padding-left: 16px; color: #555; font-style: italic; margin: 0 0 14px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    @media print { body { padding: 0; } @page { margin: 20mm; } }
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
    const images = printWindow.document.querySelectorAll('img');
    if (images.length === 0) {
      printWindow.focus();
      printWindow.print();
    } else {
      let loaded = 0;
      const tryPrint = () => { if (++loaded >= images.length) { printWindow.focus(); printWindow.print(); } };
      images.forEach((img) => { if (img.complete) tryPrint(); else { img.onload = tryPrint; img.onerror = tryPrint; } });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await analysisApi.delete(analysis.id);
      onDeleted(analysis.id);
      onClose();
    } catch {
      setDeleteError('Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal open onClose={onClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95vw', sm: '80vw', md: '70vw', lg: '60vw' },
            maxHeight: '90vh',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Modal header */}
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {analysis.title}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(analysis.created_at).format('DD MMM YYYY')}
                </Typography>
                {analysis.pair && <Chip label={analysis.pair} size="small" color="primary" variant="outlined" />}
                {analysis.timeframe && <Chip label={analysis.timeframe} size="small" color="default" variant="outlined" />}
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
              <Tooltip title="Full screen">
                <IconButton size="small" onClick={handleFullscreen}>
                  <OpenInFullIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit content">
                <IconButton size="small" onClick={handleEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit details">
                <IconButton size="small" onClick={() => setEditDetailsOpen(true)}>
                  <TuneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export .md (images embedded)">
                <IconButton size="small" onClick={() => analysisApi.exportMarkdown(analysis)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PDF">
                <IconButton size="small" onClick={handleDownloadPdf}>
                  <PictureAsPdfIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={analysis.is_shared ? "Condividi negli appunti" : "Condividi con utenti"}>
                <IconButton size="small" onClick={analysis.is_shared ? handleShareToClipboard : handleShareWithUsers}>
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={analysis.is_shared ? "Rimuovi dalla mia dashboard" : "Delete"}>
                <IconButton size="small" color="error" onClick={analysis.is_shared ? handleRemoveShared : () => setDeleteDialogOpen(true)}>
                  {analysis.is_shared ? <RemoveCircleIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <IconButton size="small" onClick={onClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Box
            id="modal-print-content"
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 3,
              py: 2,
              '& img': { maxWidth: '100%', borderRadius: 1 },
              '& pre': {
                bgcolor: 'action.hover',
                borderRadius: 1,
                p: 1.5,
                overflowX: 'auto',
              },
              '& code': { fontFamily: 'monospace', fontSize: '0.875em' },
              '& table': { borderCollapse: 'collapse', width: '100%' },
              '& th, & td': { border: '1px solid', borderColor: 'divider', p: 0.75 },
              '& blockquote': {
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                pl: 2,
                ml: 0,
                color: 'text.secondary',
              },
            }}
          >
            {analysis.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt, ...rest }) => (
                    <img
                      src={src?.startsWith('http') ? src : `${window.location.origin}${src}`}
                      alt={alt}
                      {...rest}
                      style={{ maxWidth: '100%' }}
                    />
                  ),
                }}
              >
                {analysis.content}
              </ReactMarkdown>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                No content yet.
              </Typography>
            )}
          </Box>
        </Box>
      </Modal>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete analysis?</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert>}
          <Typography>
            Are you sure you want to delete <strong>{analysis.title}</strong>? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit details modal */}
      {editDetailsOpen && (
        <EditDetailsDialog
          analysis={analysis}
          onClose={() => setEditDetailsOpen(false)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditDetailsOpen(false);
          }}
        />
      )}

      {/* Share feedback */}
      <Snackbar
        open={!!shareSnackbar}
        autoHideDuration={3000}
        onClose={() => setShareSnackbar('')}
        message={shareSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Share dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        analysisId={analysis.id}
        onShared={handleShareSuccess}
      />
    </>
  );
}

// ── Edit details sub-dialog ──────────────────────────────────────────────────

interface EditDetailsProps {
  analysis: Analysis;
  onClose: () => void;
  onSaved: (updated: Analysis) => void;
}

function EditDetailsDialog({ analysis, onClose, onSaved }: EditDetailsProps) {
  const [title, setTitle] = useState(analysis.title);
  const [pair, setPair] = useState(analysis.pair ?? '');
  const [timeframe, setTimeframe] = useState(analysis.timeframe ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await analysisApi.update(analysis.id, {
        title: title.trim(),
        pair: pair || null,
        timeframe: timeframe || null,
      });
      onSaved(updated);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit details</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Title *"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
        />
        <TextField
          label="Pair"
          select
          fullWidth
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          size="small"
        >
          <MenuItem value="">— None —</MenuItem>
          {PAIRS.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Timeframe"
          select
          fullWidth
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          size="small"
        >
          <MenuItem value="">— None —</MenuItem>
          {TIMEFRAMES.map((tf) => (
            <MenuItem key={tf} value={tf}>
              {tf}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
