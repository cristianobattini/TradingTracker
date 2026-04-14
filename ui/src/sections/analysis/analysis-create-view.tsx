import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

import { DashboardContent } from 'src/layouts/dashboard';
import { analysisApi } from 'src/services/analysis-api';
import { MarkdownEditor } from './markdown-editor';

const PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
  'BTC/USD', 'ETH/USD', 'SPX500', 'NAS100', 'GOLD', 'OIL', 'Other',
];

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

interface FormState {
  title: string;
  pair: string;
  timeframe: string;
  content: string;
}

export function AnalysisCreateView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>({
    title: '',
    pair: '',
    timeframe: '',
    content: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    setFetchLoading(true);
    analysisApi
      .get(Number(id))
      .then((a) => {
        setForm({
          title: a.title,
          pair: a.pair ?? '',
          timeframe: a.timeframe ?? '',
          content: a.content,
        });
      })
      .catch(() => setError(t('analysis.loadError')))
      .finally(() => setFetchLoading(false));
  }, [id, isEdit]);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleContentChange = (value: string) => {
    setForm((prev) => ({ ...prev, content: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError(t('analysis.titleRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        pair: form.pair || null,
        timeframe: form.timeframe || null,
        content: form.content,
      };
      if (isEdit && id) {
        await analysisApi.update(Number(id), payload);
      } else {
        await analysisApi.create(payload);
      }
      navigate('/analysis');
    } catch {
      setError(t('analysis.saveAnalysisError'));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/analysis')}
          variant="text"
          color="inherit"
        >
          {t('analysis.back')}
        </Button>
        <Typography variant="h5" sx={{ flex: 1 }}>
          {isEdit ? t('analysis.editAnalysis') : t('analysis.newAnalysis')}
        </Typography>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={loading}
        >
          {isEdit ? t('analysis.saveChanges') : t('analysis.save')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Metadata row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label={t('analysis.titleLabel')}
            fullWidth
            value={form.title}
            onChange={handleChange('title')}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={3} md={2}>
          <TextField
            label={t('analysis.pairLabel')}
            select
            fullWidth
            value={form.pair}
            onChange={handleChange('pair')}
            size="small"
          >
            <MenuItem value="">{t('analysis.none')}</MenuItem>
            {PAIRS.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3} md={2}>
          <TextField
            label={t('analysis.timeframeLabel')}
            select
            fullWidth
            value={form.timeframe}
            onChange={handleChange('timeframe')}
            size="small"
          >
            <MenuItem value="">{t('analysis.none')}</MenuItem>
            {TIMEFRAMES.map((tf) => (
              <MenuItem key={tf} value={tf}>
                {tf}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Markdown editor */}
      <MarkdownEditor value={form.content} onChange={handleContentChange} height={540} />
    </DashboardContent>
  );
}
