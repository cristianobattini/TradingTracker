import { useRef, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import { analysisApi } from 'src/services/analysis-api';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function MarkdownEditor({ value, onChange, height = 480 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const insertAtCursor = useCallback(
    (before: string, after = '', placeholder = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);
      const insert = selected || placeholder;
      const newValue = value.slice(0, start) + before + insert + after + value.slice(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        if (!selected && !placeholder) {
          const cursor = start + before.length;
          textarea.setSelectionRange(cursor, cursor);
        } else {
          const cursor = start + before.length + insert.length;
          textarea.setSelectionRange(cursor, cursor);
        }
      }, 0);
    },
    [value, onChange]
  );

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newCursor = start + prefix.length;
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    },
    [value, onChange]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      setUploadingImage(true);
      try {
        const result = await analysisApi.uploadImage(file);
        const imageUrl = analysisApi.getImageUrl(result.url);
        insertAtCursor(`![`, `](${imageUrl})`, file.name.replace(/\.[^.]+$/, ''));
      } catch {
        // silent fail — user can add image manually
      } finally {
        setUploadingImage(false);
      }
    },
    [insertAtCursor]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) {
        handleImageUpload(files[0]);
      }
    },
    [handleImageUpload]
  );

  const toolbarButtons = [
    { title: 'Heading 1', icon: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: 1 }}>H1</Box>, action: () => insertLinePrefix('# ') },
    { title: 'Heading 2', icon: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: 1 }}>H2</Box>, action: () => insertLinePrefix('## ') },
    { title: 'Heading 3', icon: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: 1 }}>H3</Box>, action: () => insertLinePrefix('### ') },
    null,
    { title: 'Bold', icon: <FormatBoldIcon fontSize="small" />, action: () => insertAtCursor('**', '**') },
    { title: 'Italic', icon: <FormatItalicIcon fontSize="small" />, action: () => insertAtCursor('*', '*') },
    null,
    { title: 'Bullet list', icon: <FormatListBulletedIcon fontSize="small" />, action: () => insertLinePrefix('- ') },
    { title: 'Numbered list', icon: <FormatListNumberedIcon fontSize="small" />, action: () => insertLinePrefix('1. ') },
    { title: 'Quote', icon: <FormatQuoteIcon fontSize="small" />, action: () => insertLinePrefix('> ') },
    { title: 'Code', icon: <CodeIcon fontSize="small" />, action: () => insertAtCursor('`', '`', 'code') },
    { title: 'Link', icon: <LinkIcon fontSize="small" />, action: () => insertAtCursor('[', '](url)', 'link text') },
    { title: 'Horizontal rule', icon: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: 1 }}>—</Box>, action: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const pos = textarea.selectionStart;
      const before = value.slice(0, pos);
      const after = value.slice(pos);
      const sep = (before.length && !before.endsWith('\n') ? '\n' : '') + '\n---\n\n';
      onChange(before + sep + after);
      setTimeout(() => {
        textarea.focus();
        const cursor = pos + sep.length;
        textarea.setSelectionRange(cursor, cursor);
      }, 0);
    }},
    null,
    {
      title: uploadingImage ? 'Caricamento…' : 'Inserisci immagine (o trascina)',
      icon: uploadingImage ? <CircularProgress size={16} /> : <ImageIcon fontSize="small" />,
      action: () => fileInputRef.current?.click(),
      disabled: uploadingImage,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height }}>
      {/* Toolbar */}
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.25,
          px: 1,
          py: 0.5,
          borderBottom: 0,
          borderRadius: '8px 8px 0 0',
        }}
      >
        {/* Tab switcher */}
        <Box sx={{ display: 'flex', mr: 1 }}>
          {(['write', 'preview'] as const).map((t) => (
            <Box
              key={t}
              onClick={() => setTab(t)}
              sx={{
                px: 1.5,
                py: 0.5,
                cursor: 'pointer',
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: tab === t ? 700 : 400,
                bgcolor: tab === t ? 'action.selected' : 'transparent',
                textTransform: 'capitalize',
                userSelect: 'none',
              }}
            >
              {t}
            </Box>
          ))}
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {tab === 'write' &&
          toolbarButtons.map((btn, i) =>
            btn === null ? (
              <Divider key={i} orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            ) : (
              <Tooltip key={btn.title} title={btn.title}>
                <span>
                  <IconButton
                    size="small"
                    onClick={btn.action}
                    disabled={btn.disabled}
                    sx={{ borderRadius: 1 }}
                  >
                    {btn.icon}
                  </IconButton>
                </span>
              </Tooltip>
            )
          )}
      </Paper>

      {/* Editor / Preview */}
      <Paper
        variant="outlined"
        onDragOver={tab === 'write' ? handleDragOver : undefined}
        onDragLeave={tab === 'write' ? handleDragLeave : undefined}
        onDrop={tab === 'write' ? handleDrop : undefined}
        sx={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: '0 0 8px 8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          ...(isDraggingOver && {
            outline: '2px dashed',
            outlineColor: 'primary.main',
            bgcolor: 'primary.50',
          }),
        }}
      >
        {/* Drag overlay */}
        {isDraggingOver && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.85)',
              borderRadius: '0 0 8px 8px',
              gap: 1,
              pointerEvents: 'none',
            }}
          >
            <ImageIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.7 }} />
            <Typography variant="body1" color="primary" fontWeight={600}>
              Rilascia l'immagine per inserirla
            </Typography>
          </Box>
        )}

        {tab === 'write' ? (
          <TextField
            inputRef={textareaRef}
            multiline
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Scrivi la tua analisi in Markdown… (o trascina un'immagine qui)"
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                height: '100%',
                alignItems: 'flex-start',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& textarea': { height: '100% !important', overflowY: 'auto !important' },
            }}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              '& img': { maxWidth: '100%' },
              '& pre': {
                bgcolor: 'action.hover',
                borderRadius: 1,
                p: 1.5,
                overflowX: 'auto',
              },
              '& code': { fontFamily: 'monospace', fontSize: '0.875em' },
              '& table': { borderCollapse: 'collapse', width: '100%' },
              '& th, & td': { border: '1px solid', borderColor: 'divider', p: 0.75 },
            }}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                Nothing to preview yet.
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Box>
  );
}
