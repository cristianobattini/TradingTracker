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
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SendIcon from '@mui/icons-material/Send';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';

import { DashboardContent } from 'src/layouts/dashboard';
import { getAuthHeaders } from 'src/lib/client-config';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
}

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'investing', label: 'Investing.com' },
  { id: 'fxstreet', label: 'FXStreet' },
  { id: 'dailyforex', label: 'DailyForex' },
  { id: 'forexfactory', label: 'ForexFactory' },
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
  } catch {
    return iso;
  }
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
  const chatRef = useRef<HTMLDivElement>(null);

  // ---- fetch news ----
  const loadNews = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const src = activeSource !== 'all' ? `&source=${activeSource}` : '';
      const res = await fetch(
        `${API_BASE}/api/news/?force_refresh=${forceRefresh}${src}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setArticles(data.articles);
    } catch (e: any) {
      setError(e.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, [activeSource]);

  useEffect(() => { loadNews(); }, [loadNews]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [aiMessages, aiLoading]);

  // ---- AI quick summary ----
  const handleSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/news/ai-summary`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiMessages([{ role: 'assistant', content: data.summary }]);
    } catch (e: any) {
      setError(e.message || 'AI summary failed');
    } finally {
      setSummaryLoading(false);
    }
  };

  // ---- AI chat ----
  const handleAiSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: aiInput };
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
      setAiMessages((m) => [...m, { role: 'assistant', content: data.report }]);
    } catch (e: any) {
      setError(e.message || 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiInput]);

  // ---- PDF export ----
  const handleExportPdf = async () => {
    if (aiMessages.length === 0) {
      setSnackbar('Generate an AI report first, then export to PDF.');
      return;
    }
    setPdfLoading(true);
    try {
      const lastReport = [...aiMessages].reverse().find((m) => m.role === 'assistant');
      if (!lastReport) { setSnackbar('No AI report to export.'); return; }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageW - margin * 2;

      // Header
      doc.setFillColor(24, 119, 242);
      doc.rect(0, 0, pageW, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Forex Market Report — Anakin TT', margin, 13);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString('it-IT')}`, margin, 27);

      // Content
      const lines = lastReport.content.split('\n');
      let y = 35;
      const lineH = 5;

      for (const raw of lines) {
        const line = raw.trim();
        if (!line) { y += 2; continue; }

        // Heading detection
        if (line.startsWith('## ')) {
          if (y > 265) { doc.addPage(); y = 20; }
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(24, 119, 242);
          const wrapped = doc.splitTextToSize(line.replace(/^##\s+/, ''), maxWidth);
          doc.text(wrapped, margin, y);
          y += wrapped.length * lineH + 3;
          doc.setTextColor(0, 0, 0);
          continue;
        }
        if (line.startsWith('# ')) {
          if (y > 265) { doc.addPage(); y = 20; }
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(24, 119, 242);
          const wrapped = doc.splitTextToSize(line.replace(/^#\s+/, ''), maxWidth);
          doc.text(wrapped, margin, y);
          y += wrapped.length * lineH + 4;
          doc.setTextColor(0, 0, 0);
          continue;
        }
        if (line.startsWith('### ')) {
          if (y > 265) { doc.addPage(); y = 20; }
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(50, 50, 50);
          const wrapped = doc.splitTextToSize(line.replace(/^###\s+/, ''), maxWidth);
          doc.text(wrapped, margin, y);
          y += wrapped.length * lineH + 2;
          doc.setTextColor(0, 0, 0);
          continue;
        }

        // Bullet
        const isBullet = line.startsWith('- ') || line.startsWith('* ');
        const text = isBullet ? '• ' + line.slice(2) : line.replace(/\*\*/g, '');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(text, isBullet ? maxWidth - 5 : maxWidth);
        if (y + wrapped.length * lineH > 280) { doc.addPage(); y = 20; }
        doc.text(wrapped, isBullet ? margin + 3 : margin, y);
        y += wrapped.length * lineH + 1;
      }

      doc.save(`forex-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setSnackbar('PDF exported successfully!');
    } catch (e: any) {
      setError('PDF export failed: ' + e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const filteredArticles = activeSource === 'all'
    ? articles
    : articles.filter((a) => a.source_id === activeSource);

  return (
    <DashboardContent>
      {/* Page header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Forex News</Typography>
          <Typography variant="body2" color="text.secondary">
            Live news from Investing.com · FXStreet · DailyForex · ForexFactory
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={summaryLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={handleSummary}
            disabled={summaryLoading || loading}
          >
            AI Summary
          </Button>
          <Button
            variant="outlined"
            startIcon={pdfLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
            onClick={handleExportPdf}
            disabled={pdfLoading}
            color="error"
          >
            Export PDF
          </Button>
          <Tooltip title="Refresh news">
            <IconButton onClick={() => loadNews(true)} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Left — News feed */}
        <Grid item xs={12} md={7}>
          <Paper elevation={1} sx={{ overflow: 'hidden' }}>
            {/* Source filter tabs */}
            <Tabs
              value={activeSource}
              onChange={(_, v) => setActiveSource(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
            >
              {SOURCES.map((s) => <Tab key={s.id} value={s.id} label={s.label} />)}
            </Tabs>

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
                  <Typography color="text.secondary">No articles available. Try refreshing.</Typography>
                </Box>
              ) : (
                filteredArticles.map((article, idx) => (
                  <Card
                    key={article.id || idx}
                    variant="outlined"
                    sx={{ mb: 1.5, '&:hover': { boxShadow: 2 }, transition: 'box-shadow .2s' }}
                  >
                    <CardContent sx={{ pb: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={article.source}
                          size="small"
                          sx={{
                            bgcolor: article.source_color + '22',
                            color: article.source_color,
                            fontWeight: 700,
                            fontSize: '0.65rem',
                          }}
                        />
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
                    </CardContent>
                    <CardActions sx={{ pt: 0 }}>
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Read full article
                      </Button>
                    </CardActions>
                  </Card>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right — AI Chat */}
        <Grid item xs={12} md={5}>
          <Paper elevation={1} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>AI Analyst</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                Ask anything about the market
              </Typography>
            </Box>

            {/* Chat history */}
            <Box ref={chatRef} sx={{ flex: 1, overflow: 'auto', minHeight: '45vh', maxHeight: '55vh', p: 1 }}>
              <List disablePadding>
                {/* Default greeting */}
                {aiMessages.length === 0 && !aiLoading && (
                  <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent', width: 32, height: 32 }}>
                        <img height="90%" src="/assets/ai-logo.png" alt="ai" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="caption" fontWeight={700}>Anakin AI</Typography>}
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          Hi! Click <strong>AI Summary</strong> for an instant market overview, or ask me anything about forex — I'll use the latest headlines to answer.
                        </Typography>
                      }
                    />
                  </ListItem>
                )}

                {aiMessages.map((msg, i) => (
                  <Box key={i}>
                    <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: msg.role === 'user' ? 'primary.main' : 'transparent',
                            width: 32, height: 32,
                          }}
                        >
                          {msg.role === 'user'
                            ? <Typography fontSize={12} fontWeight={700} color="white">You</Typography>
                            : <img height="90%" src="/assets/ai-logo.png" alt="ai" />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="caption" fontWeight={700}>
                            {msg.role === 'user' ? 'You' : 'Anakin AI'}
                          </Typography>
                        }
                        secondary={
                          msg.role === 'assistant' ? (
                            <Box sx={{ '& p': { m: 0 }, '& h1,h2,h3': { my: 0.5 }, fontSize: '0.82rem' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </Box>
                          ) : (
                            <Typography variant="body2">{msg.content}</Typography>
                          )
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </Box>
                ))}

                {aiLoading && (
                  <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent', width: 32, height: 32 }}>
                        <CircularProgress size={20} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="caption" fontWeight={700}>Anakin AI</Typography>}
                      secondary={
                        <Box>
                          <Skeleton variant="text" width="80%" />
                          <Skeleton variant="text" width="60%" />
                        </Box>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Box>

            <Divider />

            {/* Input */}
            <Box
              component="form"
              onSubmit={handleAiSend}
              sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Ask about market conditions, pairs, events…"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={aiLoading}
              />
              <IconButton color="primary" type="submit" disabled={aiLoading || !aiInput.trim()}>
                {aiLoading ? <CircularProgress size={20} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Error snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} variant="filled">{error}</Alert>
      </Snackbar>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setSnackbar('')} variant="filled">{snackbar}</Alert>
      </Snackbar>
    </DashboardContent>
  );
}
