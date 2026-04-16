import { useState, useCallback, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SendIcon from '@mui/icons-material/Send';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { DashboardContent } from 'src/layouts/dashboard';
import { getAuthHeaders } from 'src/lib/client-config';

async function fetchSavedUrls(apiBase: string): Promise<Set<string>> {
  try {
    const res = await fetch(`${apiBase}/api/bookmarks/read-later/`, { headers: getAuthHeaders() });
    if (!res.ok) return new Set();
    const data: { url: string }[] = await res.json();
    return new Set(data.map((a) => a.url));
  } catch { return new Set(); }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  published_at: string | null;
  source: string;
  source_id: string;
  source_color: string;
  site_url: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface AiModel {
  id: string;
  name: string;
}

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'investing', label: 'Investing.com' },
  { id: 'fxstreet', label: 'FXStreet' },
  { id: 'dailyforex', label: 'DailyForex' },
  { id: 'forexfactory', label: 'ForexFactory' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

// ---------------------------------------------------------------------------
// Markdown styles reused in chat and PDF hidden div
// ---------------------------------------------------------------------------
const mdStyles = {
  fontSize: '0.85rem',
  lineHeight: 1.65,
  '& p': { m: 0, mb: '6px' },
  '& h1,& h2,& h3,& h4': { my: '8px', fontWeight: 700 },
  '& h1': { fontSize: '1.15em', color: 'primary.main' },
  '& h2': { fontSize: '1.05em', color: 'primary.main' },
  '& h3': { fontSize: '0.98em' },
  '& ul,& ol': { pl: '20px', mb: '6px' },
  '& li': { mb: '3px' },
  '& strong': { fontWeight: 700 },
  '& em': { fontStyle: 'italic' },
  '& table': { borderCollapse: 'collapse', width: '100%', fontSize: '0.82em', mb: '8px' },
  '& th': { border: '1px solid', borderColor: 'divider', p: '4px 8px', background: 'action.hover', fontWeight: 700 },
  '& td': { border: '1px solid', borderColor: 'divider', p: '4px 8px' },
  '& code': { background: 'action.hover', px: '4px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.85em' },
  '& pre': { background: 'action.hover', p: '8px', borderRadius: '6px', overflow: 'auto', fontSize: '0.82em' },
  '& blockquote': { borderLeft: '3px solid', borderColor: 'primary.main', pl: '10px', color: 'text.secondary', fontStyle: 'italic', my: '6px' },
  '& hr': { border: 'none', borderTop: '1px solid', borderColor: 'divider', my: '8px' },
};

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------
async function exportMarkdownToPdf(pdfRef: HTMLDivElement): Promise<void> {
  const canvas = await html2canvas(pdfRef, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let remainingH = imgH;
  let srcY = 0;
  while (remainingH > 0) {
    const sliceH = Math.min(pageH, remainingH);
    const slicePx = (sliceH / imgH) * canvas.height;
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = slicePx;
    slice.getContext('2d')!.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
    doc.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, imgW, sliceH);
    remainingH -= pageH;
    srcY += slicePx;
    if (remainingH > 0) doc.addPage();
  }
  doc.save(`forex-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NewsView() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState('all');
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [search, setSearch] = useState('');
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const [models, setModels] = useState<AiModel[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const pdfExportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchSavedUrls(API_BASE).then(setSavedUrls); }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/ai/models`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => { setModels(data.models ?? []); setCurrentModel(data.current ?? ''); })
      .catch(() => {});
  }, []);

  const handleModelChange = async (modelId: string) => {
    setCurrentModel(modelId);
    try {
      await fetch(`${API_BASE}/api/ai/model?model_id=${encodeURIComponent(modelId)}`, {
        method: 'PUT', headers: getAuthHeaders(),
      });
    } catch { setError('Errore aggiornamento modello'); }
  };

  const handleToggleSave = useCallback(async (article: NewsArticle) => {
    if (savedUrls.has(article.url)) {
      try {
        const res = await fetch(`${API_BASE}/api/bookmarks/read-later/`, { headers: getAuthHeaders() });
        const list: { id: number; url: string }[] = await res.json();
        const found = list.find((a) => a.url === article.url);
        if (found) await fetch(`${API_BASE}/api/bookmarks/read-later/${found.id}`, { method: 'DELETE', headers: getAuthHeaders() });
        setSavedUrls((prev) => { const s = new Set(prev); s.delete(article.url); return s; });
        setSnackbar('Rimosso da Leggi più tardi');
      } catch { setSnackbar('Errore rimozione'); }
    } else {
      try {
        await fetch(`${API_BASE}/api/bookmarks/read-later/`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: article.title, summary: article.summary, url: article.url, published_at: article.published_at, source: article.source, source_id: article.source_id, source_color: article.source_color, site_url: article.site_url, expires_days: 14 }),
        });
        setSavedUrls((prev) => new Set([...prev, article.url]));
        setSnackbar('Salvato — scade tra 2 settimane');
      } catch { setSnackbar('Errore salvataggio'); }
    }
  }, [savedUrls]);

  const loadNews = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const src = activeSource !== 'all' ? `&source=${activeSource}` : '';
      const res = await fetch(`${API_BASE}/api/news/?force_refresh=${forceRefresh}${src}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      setArticles((await res.json()).articles);
    } catch (e: any) {
      setError(e.message || 'Errore caricamento notizie');
    } finally { setLoading(false); }
  }, [activeSource]);

  useEffect(() => { loadNews(); }, [loadNews]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [aiMessages, aiLoading]);

  const handleSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/news/ai-summary`, { method: 'POST', headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiMessages([{ role: 'assistant', content: data.summary, ts: Date.now() }]);
    } catch (e: any) {
      setError(e.message || 'Errore riassunto AI');
    } finally { setSummaryLoading(false); }
  };

  const handleAiSend = useCallback(async () => {
    if (!aiInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: aiInput.trim(), ts: Date.now() };
    setAiMessages((m) => [...m, userMsg]);
    setAiInput('');
    setAiLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/news/ai-report?question=${encodeURIComponent(userMsg.content)}`,
        { method: 'POST', headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiMessages((m) => [...m, { role: 'assistant', content: data.report, ts: Date.now() }]);
    } catch (e: any) {
      setError(e.message || 'Errore AI');
    } finally { setAiLoading(false); }
  }, [aiInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  const handleExportPdf = async () => {
    const lastReport = [...aiMessages].reverse().find((m) => m.role === 'assistant');
    if (!lastReport) { setSnackbar('Genera prima un report AI.'); return; }
    if (!pdfExportRef.current) return;
    setPdfLoading(true);
    try {
      await exportMarkdownToPdf(pdfExportRef.current);
      setSnackbar('PDF esportato!');
    } catch (e: any) {
      setError('Errore PDF: ' + e.message);
    } finally { setPdfLoading(false); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => setSnackbar('Copiato negli appunti'));
  };

  const lastAssistantContent = [...aiMessages].reverse().find((m) => m.role === 'assistant')?.content ?? '';

  const q = search.trim().toLowerCase();
  const filteredArticles = articles
    .filter((a) => activeSource === 'all' || a.source_id === activeSource)
    .filter((a) => !q || a.title.toLowerCase().includes(q) || a.summary?.toLowerCase().includes(q));

  function highlightText(text: string): React.ReactNode {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#FFD60044', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Chat panel (extracted to keep JSX readable)
  // ---------------------------------------------------------------------------
  const chatPanel = (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: chatExpanded ? 'calc(100vh - 180px)' : '100%',
        minHeight: chatExpanded ? 600 : 500,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <Box sx={{
        px: 2, py: 1.25,
        borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 1,
        background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      }}>
        <Avatar sx={{ width: 28, height: 28, bgcolor: 'transparent' }}>
          <img height="90%" src="/assets/ai-logo.png" alt="ai" />
        </Avatar>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>Analista IA</Typography>
          {currentModel && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
              {models.find((m) => m.id === currentModel)?.name ?? currentModel}
            </Typography>
          )}
        </Box>

        {/* Model selector */}
        {models.length > 0 && (
          <FormControl size="small" sx={{ ml: 'auto', minWidth: 190 }}>
            <InputLabel sx={{ fontSize: '0.72rem' }}>Modello</InputLabel>
            <Select
              value={currentModel}
              label="Modello"
              onChange={(e) => handleModelChange(e.target.value)}
              sx={{ fontSize: '0.72rem' }}
            >
              {models.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.75rem' }}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Action buttons */}
        <Tooltip title="Cancella chat">
          <span>
            <IconButton
              size="small"
              onClick={() => setAiMessages([])}
              disabled={aiMessages.length === 0}
              sx={{ ml: models.length > 0 ? 0.5 : 'auto' }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={chatExpanded ? 'Riduci' : 'Espandi'}>
          <IconButton size="small" onClick={() => setChatExpanded((v) => !v)}>
            {chatExpanded ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Messages ── */}
      <Box
        ref={chatRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {/* Greeting */}
        {aiMessages.length === 0 && !aiLoading && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent', flexShrink: 0 }}>
              <img height="90%" src="/assets/ai-logo.png" alt="ai" />
            </Avatar>
            <Box
              sx={{
                background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderRadius: '4px 16px 16px 16px',
                px: 2, py: 1.25,
                maxWidth: '88%',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                Anakin AI
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ciao! Clicca <strong>Riassunto IA</strong> per una panoramica del mercato, oppure scrivimi qualsiasi domanda sul forex.
              </Typography>
            </Box>
          </Box>
        )}

        {aiMessages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <Box
              key={i}
              sx={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: 1.5,
                alignItems: 'flex-start',
              }}
            >
              {/* Avatar */}
              {!isUser && (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent', flexShrink: 0, mt: 0.25 }}>
                  <img height="90%" src="/assets/ai-logo.png" alt="ai" />
                </Avatar>
              )}

              {/* Bubble */}
              <Box sx={{ maxWidth: isUser ? '75%' : '88%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 0.25 }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: isUser
                      ? 'primary.main'
                      : (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    bgcolor: isUser ? 'primary.main' : undefined,
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    wordBreak: 'break-word',
                  }}
                >
                  {isUser ? (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                  ) : (
                    <Box sx={mdStyles}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </Box>
                  )}
                </Box>

                {/* Timestamp + copy */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                    {formatTime(msg.ts)}
                  </Typography>
                  {!isUser && (
                    <Tooltip title="Copia">
                      <IconButton size="small" onClick={() => handleCopy(msg.content)} sx={{ p: 0.25 }}>
                        <ContentCopyIcon sx={{ fontSize: '0.75rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Loading indicator */}
        {aiLoading && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent', flexShrink: 0, mt: 0.25 }}>
              <CircularProgress size={20} />
            </Avatar>
            <Box
              sx={{
                background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderRadius: '4px 16px 16px 16px',
                px: 2, py: 1.25,
              }}
            >
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: 24 }}>
                {[0, 1, 2].map((j) => (
                  <Box
                    key={j}
                    sx={{
                      width: 7, height: 7, borderRadius: '50%',
                      bgcolor: 'text.disabled',
                      animation: 'bounce 1.2s infinite',
                      animationDelay: `${j * 0.2}s`,
                      '@keyframes bounce': {
                        '0%,80%,100%': { transform: 'scale(0.7)', opacity: 0.5 },
                        '40%': { transform: 'scale(1)', opacity: 1 },
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Divider />

      {/* ── Input ── */}
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={5}
          size="small"
          placeholder="Scrivi un messaggio… (Invio per inviare, Shift+Invio per andare a capo)"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={aiLoading}
          inputRef={inputRef}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 3 },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleAiSend}
          disabled={aiLoading || !aiInput.trim()}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
            '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
            width: 40, height: 40, flexShrink: 0,
            mb: 0.25,
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );

  return (
    <DashboardContent>
      {/* Hidden PDF export area */}
      <Box
        ref={pdfExportRef}
        sx={{
          position: 'fixed', top: '-99999px', left: '-99999px',
          width: '794px', background: '#fff', color: '#000',
          fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', lineHeight: 1.6,
        }}
      >
        <Box sx={{ background: '#1877F2', color: '#fff', p: '16px 24px', mb: '24px' }}>
          <Box sx={{ fontWeight: 700, fontSize: '18px', color: '#fff' }}>Forex Market Report — Anakin TT</Box>
          <Box sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', mt: '4px' }}>
            Generato: {new Date().toLocaleString('it-IT')}
          </Box>
        </Box>
        <Box sx={{
          px: '32px', pb: '32px',
          '& h1': { fontSize: '22px', fontWeight: 700, color: '#1877F2', borderBottom: '2px solid #1877F2', pb: '6px', mt: '20px', mb: '12px' },
          '& h2': { fontSize: '18px', fontWeight: 700, color: '#1877F2', mt: '18px', mb: '8px' },
          '& h3': { fontSize: '15px', fontWeight: 700, color: '#333', mt: '14px', mb: '6px' },
          '& p': { margin: '0 0 8px 0' },
          '& ul,& ol': { pl: '20px', mb: '8px' },
          '& li': { mb: '3px' },
          '& strong': { fontWeight: 700 },
          '& table': { borderCollapse: 'collapse', width: '100%', mb: '12px' },
          '& th': { border: '1px solid #ccc', p: '6px 10px', background: '#f5f5f5', fontWeight: 700 },
          '& td': { border: '1px solid #ccc', p: '6px 10px' },
          '& blockquote': { borderLeft: '3px solid #1877F2', pl: '12px', color: '#555', fontStyle: 'italic' },
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{lastAssistantContent}</ReactMarkdown>
        </Box>
      </Box>

      {/* ── Page header ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Notizie Forex</Typography>
          <Typography variant="body2" color="text.secondary">
            Notizie in tempo reale da Investing.com · FXStreet · DailyForex · ForexFactory
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={summaryLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={handleSummary}
            disabled={summaryLoading || loading}
          >
            Riassunto IA
          </Button>
          <Button
            variant="outlined"
            startIcon={pdfLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
            onClick={handleExportPdf}
            disabled={pdfLoading}
            color="error"
          >
            Esporta PDF
          </Button>
          <Tooltip title="Aggiorna notizie">
            <IconButton onClick={() => loadNews(true)} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Main grid ── */}
      <Grid container spacing={2}>
        {/* News feed — hidden when chat is expanded */}
        {!chatExpanded && (
          <Grid item xs={12} md={7}>
            <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2 }}>
              <Tabs
                value={activeSource}
                onChange={(_, v) => setActiveSource(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
              >
                {SOURCES.map((s) => <Tab key={s.id} value={s.id} label={s.label} />)}
              </Tabs>

              <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth size="small"
                  placeholder="Cerca articoli per titolo o contenuto…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>,
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch('')} edge="end"><ClearIcon fontSize="small" /></IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </Box>

              <Box sx={{ maxHeight: '70vh', overflow: 'auto', p: 1 }}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Box key={i} sx={{ p: 1.5, mb: 1 }}>
                      <Skeleton variant="text" width="70%" height={24} />
                      <Skeleton variant="text" width="40%" height={16} sx={{ mb: 0.5 }} />
                      <Skeleton variant="text" width="90%" />
                      <Skeleton variant="text" width="80%" />
                    </Box>
                  ))
                ) : filteredArticles.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      {q ? `Nessun articolo per "${search}".` : 'Nessun articolo disponibile. Prova ad aggiornare.'}
                    </Typography>
                  </Box>
                ) : (
                  filteredArticles.map((article, idx) => (
                    <Card key={article.id || idx} variant="outlined" sx={{ mb: 1.5, '&:hover': { boxShadow: 2 }, transition: 'box-shadow .2s' }}>
                      <CardContent sx={{ pb: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={article.source} size="small"
                            sx={{ bgcolor: article.source_color + '22', color: article.source_color, fontWeight: 700, fontSize: '0.65rem' }}
                          />
                          {article.published_at && (
                            <Typography variant="caption" color="text.disabled">{formatDate(article.published_at)}</Typography>
                          )}
                        </Box>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>{highlightText(article.title)}</Typography>
                        {article.summary && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{highlightText(article.summary)}</Typography>
                        )}
                      </CardContent>
                      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                        <Button size="small" endIcon={<OpenInNewIcon fontSize="small" />} href={article.url} target="_blank" rel="noopener noreferrer">
                          Leggi articolo completo
                        </Button>
                        <Tooltip title={savedUrls.has(article.url) ? 'Rimuovi da Leggi più tardi' : 'Salva per dopo'}>
                          <IconButton size="small" onClick={() => handleToggleSave(article)} color={savedUrls.has(article.url) ? 'primary' : 'default'}>
                            {savedUrls.has(article.url) ? <BookmarkAddedIcon fontSize="small" /> : <BookmarkAddIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  ))
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* AI Chat */}
        <Grid item xs={12} md={chatExpanded ? 12 : 5}>
          {chatPanel}
        </Grid>
      </Grid>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError('')} variant="filled">{error}</Alert>
      </Snackbar>
      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="info" onClose={() => setSnackbar('')} variant="filled">{snackbar}</Alert>
      </Snackbar>
    </DashboardContent>
  );
}
