import { useState, useCallback, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorageIcon from '@mui/icons-material/Storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { askQuestionApiAiAskPost } from 'src/client';
import { DashboardContent } from 'src/layouts/dashboard';
import { getAuthHeaders } from 'src/lib/client-config';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface AiModel {
  id: string;
  name: string;
}

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

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

export function AIView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeTradeData, setIncludeTradeData] = useState(false);
  const [models, setModels] = useState<AiModel[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/ai/models`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => { setModels(d.models ?? []); setCurrentModel(d.current ?? ''); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleModelChange = async (modelId: string) => {
    setCurrentModel(modelId);
    try {
      await fetch(`${API_BASE}/api/ai/model?model_id=${encodeURIComponent(modelId)}`, {
        method: 'PUT', headers: getAuthHeaders(),
      });
    } catch { setError('Errore aggiornamento modello'); }
  };

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    const userMsg: Message = { role: 'user', content: prompt.trim(), ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setPrompt('');
    setIsLoading(true);
    try {
      const response = await askQuestionApiAiAskPost({
        query: { question: userMsg.content, user_data_required: includeTradeData },
      });
      const answer = (response.data as { answer: string }).answer;
      setMessages((m) => [...m, { role: 'assistant', content: answer, ts: Date.now() }]);
    } catch (err: any) {
      setError(err?.message || 'Errore durante la richiesta.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, includeTradeData]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => setSnackbar('Copiato negli appunti'));
  };

  return (
    <DashboardContent>
      {/* Page header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Chat IA</Typography>
          <Typography variant="body2" color="text.secondary">
            Chiedi analisi di trading, valutazioni del tuo diario e consigli strategici
          </Typography>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)', minHeight: 500, borderRadius: 2, overflow: 'hidden' }}>

        {/* ── Header ── */}
        <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'transparent' }}>
            <img height="90%" src="/assets/ai-logo.png" alt="ai" />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>Anakin AI</Typography>
            {currentModel && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                {models.find((m) => m.id === currentModel)?.name ?? currentModel}
              </Typography>
            )}
          </Box>

          {/* Model selector */}
          {models.length > 0 && (
            <FormControl size="small" sx={{ ml: 'auto', minWidth: 200 }}>
              <InputLabel sx={{ fontSize: '0.72rem' }}>Modello</InputLabel>
              <Select value={currentModel} label="Modello" onChange={(e) => handleModelChange(e.target.value)} sx={{ fontSize: '0.72rem' }}>
                {models.map((m) => <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.75rem' }}>{m.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {/* Include trade data toggle */}
          <Tooltip title={includeTradeData ? 'Dati trade inclusi nella risposta' : 'Includi i tuoi trade nella risposta'}>
            <Chip
              icon={<StorageIcon fontSize="small" />}
              label="Dati trade"
              size="small"
              onClick={() => setIncludeTradeData((v) => !v)}
              color={includeTradeData ? 'primary' : 'default'}
              variant={includeTradeData ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.72rem', cursor: 'pointer', ml: models.length > 0 ? 0.5 : 'auto' }}
            />
          </Tooltip>

          {/* Clear chat */}
          <Tooltip title="Cancella chat">
            <span>
              <IconButton size="small" onClick={() => setMessages([])} disabled={messages.length === 0}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* ── Messages ── */}
        <Box ref={listRef} sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Greeting */}
          {messages.length === 0 && !isLoading && (
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent', flexShrink: 0 }}>
                <img height="90%" src="/assets/ai-logo.png" alt="ai" />
              </Avatar>
              <Box sx={{ background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: '4px 16px 16px 16px', px: 2, py: 1.5, maxWidth: '70%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>Anakin AI</Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Ciao! Sono il tuo assistente di trading. Posso aiutarti con:
                </Typography>
                {[
                  'Analisi delle tue performance di trading',
                  'Valutazione del rischio e position sizing',
                  'Strategie e setup di mercato',
                  'Interpretazione di dati e pattern',
                ].map((s) => (
                  <Button
                    key={s}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5, fontSize: '0.72rem', textTransform: 'none', borderRadius: 3 }}
                    onClick={() => { setPrompt(s); inputRef.current?.focus(); }}
                  >
                    {s}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <Box key={i} sx={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 1.5, alignItems: 'flex-start' }}>
                {!isUser && (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent', flexShrink: 0, mt: 0.25 }}>
                    <img height="90%" src="/assets/ai-logo.png" alt="ai" />
                  </Avatar>
                )}

                <Box sx={{ maxWidth: isUser ? '70%' : '85%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 0.25 }}>
                  <Box sx={{
                    px: 2, py: 1.25,
                    borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    bgcolor: isUser ? 'primary.main' : undefined,
                    background: isUser ? undefined : (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    wordBreak: 'break-word',
                  }}>
                    {isUser
                      ? <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                      : <Box sx={mdStyles}><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></Box>
                    }
                  </Box>

                  {/* Timestamp + copy */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 0.5 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>{formatTime(msg.ts)}</Typography>
                    {!isUser && (
                      <Tooltip title="Copia risposta">
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

          {/* Loading dots */}
          {isLoading && (
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent', flexShrink: 0, mt: 0.25 }}>
                <CircularProgress size={20} />
              </Avatar>
              <Box sx={{ background: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: '4px 16px 16px 16px', px: 2, py: 1.25 }}>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: 24 }}>
                  {[0, 1, 2].map((j) => (
                    <Box key={j} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'text.disabled', animation: 'bounce 1.2s infinite', animationDelay: `${j * 0.2}s`, '@keyframes bounce': { '0%,80%,100%': { transform: 'scale(0.7)', opacity: 0.5 }, '40%': { transform: 'scale(1)', opacity: 1 } } }} />
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
            fullWidth multiline maxRows={6} size="small"
            placeholder="Scrivi un messaggio… (Invio per inviare, Shift+Invio per andare a capo)"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); if (error) setError(''); }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            inputRef={inputRef}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <IconButton
            color="primary"
            onClick={handleSubmit}
            disabled={isLoading || !prompt.trim()}
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' }, width: 40, height: 40, flexShrink: 0, mb: 0.25 }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="info" onClose={() => setSnackbar('')} variant="filled">{snackbar}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError('')} variant="filled">{error}</Alert>
      </Snackbar>
    </DashboardContent>
  );
}
