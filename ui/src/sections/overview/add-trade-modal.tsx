import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Divider,
  Grid2,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
} from '@mui/material';
import { createTradeApiTradesPost, TradeCreate, TradeResponse } from 'src/client';
import { readUsersMeApiUsersMeGet } from 'src/client/sdk.gen';

interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onTradeAdded: (trade: TradeResponse) => void;
  loading?: boolean;
}

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 860,
  maxWidth: '96vw',
  maxHeight: '92vh',
  overflow: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const currencyPairs = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'EUR/CAD', 'GBP/CAD',
];
const tradingSystems = ['30min', '1hr', '4hr', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
const riskLevels = ['0.25%', '0.5%', '1%', '1.5%', '2%', '3%', '5%'];
const leverageOptions = [1, 2, 5, 10, 20, 30, 50, 100, 200, 500];

function getPipSize(pair: string): number {
  if (pair && pair.toUpperCase().includes('JPY')) return 0.01;
  return 0.0001;
}

/** Valore monetario di 1 pip nella valuta quotata del pair. */
function calcPipValue(lots: number, pair: string): { value: number; currency: string } | null {
  if (!lots || !pair) return null;
  const parts = pair.split('/');
  if (parts.length !== 2) return null;
  const pipSize = getPipSize(pair);
  return { value: lots * 100_000 * pipSize, currency: parts[1] };
}

const initialForm = (): TradeCreate => ({
  date: new Date().toISOString().split('T')[0],
  pair: '',
  system: '',
  action: 'BUY',
  risk: '1%',
  risk_percent: 1,
  lots: 0.1,
  entry: 0,
  sl1_pips: 0,
  tp1_pips: 0,
  sl2_pips: 0,
  tp2_pips: 0,
  cancelled: false,
  profit_or_loss: 0,
  comments: '',
  instrument_name: '',
  isin: '',
  currency: '',
  operation_type: '',
  sign: '',
  quantity: 0,
  exchange_rate: 0,
  gross_amount: 0,
  commission_fund: 0,
  commission_bank: 0,
  commission_sgr: 0,
  commission_admin: 0,
});

export function AddTradeModal({ open, onClose, onTradeAdded, loading = false }: AddTradeModalProps) {
  const [formData, setFormData] = useState<TradeCreate>(initialForm());

  // SL/TP mode: 'pips' | 'price'
  const [slTpMode, setSlTpMode] = useState<'pips' | 'price'>('pips');
  const [sl1Price, setSl1Price] = useState('');
  const [tp1Price, setTp1Price] = useState('');
  const [sl2Price, setSl2Price] = useState('');
  const [tp2Price, setTp2Price] = useState('');

  const [marginType, setMarginType] = useState<'leverage' | 'percentage'>('leverage');
  const [leverage, setLeverage] = useState(30);
  const [marginPercentage, setMarginPercentage] = useState(2);

  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [fxRate, setFxRate] = useState(1);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch account currency when modal opens
  useEffect(() => {
    if (!open) return;
    readUsersMeApiUsersMeGet().then(res => {
      if (res.data?.account_currency) setAccountCurrency(res.data.account_currency);
    }).catch(() => {});
  }, [open]);

  const pipSize = getPipSize(formData.pair ?? '');

  const priceToP = (price: string, entry: number): number => {
    const p = parseFloat(price);
    if (isNaN(p) || entry === 0) return 0;
    return Math.abs(p - entry) / pipSize;
  };

  const pipsToPrice = (pips: number, entry: number, isSL: boolean): string => {
    const e = parseFloat(entry as any);
    const p = parseFloat(pips as any);
    if (!e || isNaN(e) || isNaN(p)) return '';
    const action = formData.action ?? 'BUY';
    if (isSL) return (action === 'BUY' ? e - p * pipSize : e + p * pipSize).toFixed(5);
    return (action === 'BUY' ? e + p * pipSize : e - p * pipSize).toFixed(5);
  };

  const handleModeChange = (_: any, newMode: 'pips' | 'price' | null) => {
    if (!newMode || newMode === slTpMode) return;
    const entry = formData.entry ?? 0;
    if (newMode === 'price') {
      setSl1Price(entry ? pipsToPrice(formData.sl1_pips ?? 0, entry, true) : '');
      setTp1Price(entry ? pipsToPrice(formData.tp1_pips ?? 0, entry, false) : '');
      setSl2Price(entry && (formData.sl2_pips ?? 0) > 0 ? pipsToPrice(formData.sl2_pips ?? 0, entry, true) : '');
      setTp2Price(entry && (formData.tp2_pips ?? 0) > 0 ? pipsToPrice(formData.tp2_pips ?? 0, entry, false) : '');
    }
    setSlTpMode(newMode);
  };

  const handlePriceChange = (field: 'sl1' | 'tp1' | 'sl2' | 'tp2', value: string) => {
    const pips = priceToP(value, formData.entry ?? 0);
    switch (field) {
      case 'sl1': setSl1Price(value); setFormData(p => ({ ...p, sl1_pips: pips })); break;
      case 'tp1': setTp1Price(value); setFormData(p => ({ ...p, tp1_pips: pips })); break;
      case 'sl2': setSl2Price(value); setFormData(p => ({ ...p, sl2_pips: pips })); break;
      case 'tp2': setTp2Price(value); setFormData(p => ({ ...p, tp2_pips: pips })); break;
    }
  };

  // ── Derived calculations ───────────────────────────────────────────────────
  const lots = parseFloat(formData.lots as any) || 0;
  const entry = parseFloat(formData.entry as any) || 0;
  const sl1 = parseFloat(formData.sl1_pips as any) || 0;
  const tp1 = parseFloat(formData.tp1_pips as any) || 0;

  // Notional in quote currency: lots × 100,000 × entry
  const totalOperation = useMemo(() => lots * 100_000 * entry, [lots, entry]);

  // ── Multi-currency derivations ─────────────────────────────────────────────
  const baseCurrency = useMemo(() => (formData.pair ?? '').split('/')[0] ?? '', [formData.pair]);
  const quoteCurrency = useMemo(() => (formData.pair ?? '').split('/')[1] ?? '', [formData.pair]);

  // Conversion needed only when quote ≠ account currency
  const needsFx = !!(quoteCurrency && accountCurrency && quoteCurrency !== accountCurrency);

  // When base === account (e.g. EUR account + EUR/USD), rate = 1/entry (derived automatically)
  const autoFxRate = useMemo(() => {
    if (!needsFx) return 1;
    if (baseCurrency === accountCurrency && entry > 0) return 1 / entry;
    return null; // user must provide
  }, [needsFx, baseCurrency, accountCurrency, entry]);

  // Effective rate: auto-derived when possible, otherwise user-provided
  const effectiveFxRate = autoFxRate !== null ? autoFxRate : fxRate;

  // Pip value in quote currency: lots × 100,000 × pipSize
  const pipValueQuote = useMemo(
    () => (lots > 0 && formData.pair ? lots * 100_000 * pipSize : 0),
    [lots, formData.pair, pipSize],
  );

  // Pip value in account currency
  const pipValueAccount = useMemo(
    () => (needsFx || quoteCurrency === accountCurrency ? pipValueQuote * effectiveFxRate : pipValueQuote),
    [pipValueQuote, effectiveFxRate, needsFx, quoteCurrency, accountCurrency],
  );

  // Notional in account currency = lots × 100,000 × entry × effectiveFxRate
  const totalOperationAccount = useMemo(
    () => totalOperation * effectiveFxRate,
    [totalOperation, effectiveFxRate],
  );

  const margin = useMemo(
    () => (leverage > 0 ? totalOperationAccount / leverage : 0),
    [totalOperationAccount, leverage],
  );
  const marginFromPercentage = useMemo(
    () => totalOperationAccount * (marginPercentage / 100),
    [totalOperationAccount, marginPercentage],
  );
  const displayMargin = marginType === 'leverage' ? margin : marginFromPercentage;

  // Expected P&L in account currency
  const expectedTp1 = useMemo(() => (pipValueAccount > 0 && tp1 > 0 ? pipValueAccount * tp1 : null), [pipValueAccount, tp1]);
  const expectedSl1 = useMemo(() => (pipValueAccount > 0 && sl1 > 0 ? -pipValueAccount * sl1 : null), [pipValueAccount, sl1]);
  const riskReward = useMemo(() => (sl1 > 0 && tp1 > 0 ? tp1 / sl1 : null), [sl1, tp1]);

  const fmt = (n: number, dec = 2) => n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fmtPnl = (n: number, cur: string) => `${n >= 0 ? '+' : ''}${fmt(n)} ${cur}`;

  // Reset manual fxRate when pair or account changes
  useEffect(() => { setFxRate(1); }, [formData.pair, accountCurrency]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'entry' && slTpMode === 'price') {
      const newEntry = parseFloat(value);
      if (!isNaN(newEntry)) {
        setFormData(prev => ({
          ...prev,
          entry: newEntry,
          sl1_pips: sl1Price ? priceToP(sl1Price, newEntry) : prev.sl1_pips,
          tp1_pips: tp1Price ? priceToP(tp1Price, newEntry) : prev.tp1_pips,
          sl2_pips: sl2Price ? priceToP(sl2Price, newEntry) : prev.sl2_pips,
          tp2_pips: tp2Price ? priceToP(tp2Price, newEntry) : prev.tp2_pips,
        }));
      }
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'risk' ? { risk_percent: parseFloat(value.replace('%', '')) } : {}),
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = 'Data obbligatoria';
    if (!formData.pair) newErrors.pair = 'Coppia obbligatoria';
    if (!formData.system) newErrors.system = 'Sistema obbligatorio';
    if (!formData.entry || formData.entry <= 0) newErrors.entry = 'Entry deve essere positivo';
    if (!formData.lots || formData.lots <= 0) newErrors.lots = 'Lotti devono essere positivi';
    if (!formData.sl1_pips || formData.sl1_pips <= 0) newErrors.sl1_pips = 'SL1 deve essere positivo';
    if (!formData.tp1_pips || formData.tp1_pips <= 0) newErrors.tp1_pips = 'TP1 deve essere positivo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const trade: TradeCreate = {
        ...formData,
        profit_or_loss: formData.cancelled ? 0 : formData.profit_or_loss,
        leverage: marginType === 'leverage' ? leverage : undefined,
        percentage_margin: marginType === 'percentage' ? marginPercentage : undefined,
      };
      const response = await createTradeApiTradesPost({ body: trade });
      if (response.data) onTradeAdded(response.data);
      handleClose();
    } catch {
      setErrors({ submit: 'Impossibile salvare il trade. Riprova.' });
    }
  };

  const handleClose = () => {
    setFormData(initialForm());
    setSlTpMode('pips');
    setSl1Price(''); setTp1Price(''); setSl2Price(''); setTp2Price('');
    setErrors({});
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Typography variant="h5" gutterBottom>Nuovo Trade</Typography>
        <Divider sx={{ mb: 3 }} />
        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={3}>

            {/* ── Informazioni di base ─────────────────────────────────── */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Informazioni</Typography>
              <Stack spacing={2}>
                <TextField
                  required type="date" name="date" label="Data"
                  value={formData.date} onChange={handleChange} fullWidth
                  error={!!errors.date} helperText={errors.date}
                  InputLabelProps={{ shrink: true }} disabled={loading}
                />
                <FormControl fullWidth required error={!!errors.pair} disabled={loading}>
                  <InputLabel>Coppia</InputLabel>
                  <Select name="pair" value={formData.pair} onChange={handleSelectChange} label="Coppia">
                    {currencyPairs.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth required error={!!errors.system} disabled={loading}>
                  <InputLabel>Sistema</InputLabel>
                  <Select name="system" value={formData.system} onChange={handleSelectChange} label="Sistema">
                    {tradingSystems.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Direzione</InputLabel>
                  <Select name="action" value={formData.action} onChange={handleSelectChange} label="Direzione">
                    <MenuItem value="BUY"><Chip label="BUY" color="success" size="small" /></MenuItem>
                    <MenuItem value="SELL"><Chip label="SELL" color="error" size="small" /></MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Rischio</InputLabel>
                  <Select name="risk" value={formData.risk} onChange={handleSelectChange} label="Rischio">
                    {riskLevels.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            </Grid2>

            {/* ── Dimensione posizione ─────────────────────────────────── */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom color="primary">Posizione</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Lotti" name="lots" type="number" value={formData.lots}
                  onChange={handleChange} fullWidth
                  error={!!errors.lots} helperText={errors.lots}
                  inputProps={{ min: 0.01, step: 0.01 }} disabled={loading}
                />
                <TextField
                  label="Prezzo Entry" name="entry" type="number" value={formData.entry}
                  onChange={handleChange} fullWidth
                  error={!!errors.entry} helperText={errors.entry}
                  inputProps={{ step: 0.00001 }} disabled={loading}
                />

                {/* Calcolo posizione */}
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Calcolo Posizione
                    </Typography>
                    {accountCurrency && (
                      <Chip label={`Conto: ${accountCurrency}`} size="small" variant="outlined" />
                    )}
                  </Box>
                  <Stack spacing={0.75}>

                    {/* ── Nozionale ──────────────────────────────────────── */}
                    {baseCurrency && (
                      <Row
                        label={`Quantità base (${baseCurrency}):`}
                        value={`${fmt(lots * 100_000)} ${baseCurrency}`}
                      />
                    )}
                    {quoteCurrency && totalOperation > 0 && (
                      <Row
                        label={`Nozionale (${quoteCurrency}):`}
                        value={`${fmt(totalOperation)} ${quoteCurrency}`}
                      />
                    )}
                    {totalOperationAccount > 0 && (
                      <Row
                        label={`Nozionale (${accountCurrency}):`}
                        value={`${needsFx ? '≈ ' : ''}${fmt(totalOperationAccount)} ${accountCurrency}`}
                        valueColor="text.primary"
                      />
                    )}

                    <Divider sx={{ my: 0.25 }} />

                    {/* ── Valore pip ─────────────────────────────────────── */}
                    {pipValueQuote > 0 && (
                      <Row
                        label={`Valore pip (${quoteCurrency}):`}
                        value={`${fmt(pipValueQuote)} ${quoteCurrency}`}
                      />
                    )}

                    {/* Tasso di cambio */}
                    {needsFx && autoFxRate !== null && (
                      <Row
                        label={`Tasso 1 ${quoteCurrency} → ${accountCurrency}:`}
                        value={`${fmt(autoFxRate, 5)} (da entry)`}
                        valueColor="text.secondary"
                      />
                    )}
                    {needsFx && autoFxRate === null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                          1 {quoteCurrency} → {accountCurrency}:
                        </Typography>
                        <TextField
                          size="small" type="number" value={fxRate}
                          onChange={e => setFxRate(Math.max(0.000001, Number(e.target.value)))}
                          inputProps={{ min: 0.000001, step: 0.00001, style: { fontSize: '0.75rem' } }}
                          sx={{ width: 110, '& input': { padding: '3px 6px' } }}
                        />
                      </Box>
                    )}

                    {needsFx && pipValueAccount > 0 && (
                      <Row
                        label={`Valore pip (${accountCurrency}):`}
                        value={`≈ ${fmt(pipValueAccount)} ${accountCurrency}`}
                        valueColor="primary.main"
                      />
                    )}
                    {!needsFx && pipValueAccount > 0 && (
                      <Row
                        label={`Valore pip (${accountCurrency}):`}
                        value={`${fmt(pipValueAccount)} ${accountCurrency}`}
                        valueColor="primary.main"
                      />
                    )}

                    <Divider sx={{ my: 0.25 }} />

                    {/* ── Margine ────────────────────────────────────────── */}
                    <Box sx={{ display: 'flex', gap: 1, my: 0.25 }}>
                      <ToggleButtonGroup
                        value={marginType} exclusive
                        onChange={(_, v) => v && setMarginType(v)}
                        size="small" fullWidth
                      >
                        <ToggleButton value="leverage" sx={{ fontSize: '0.72rem' }}>Leverage</ToggleButton>
                        <ToggleButton value="percentage" sx={{ fontSize: '0.72rem' }}>% Margin</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    {marginType === 'leverage' ? (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Leva 1:</Typography>
                        <Select size="small" value={leverage} onChange={e => setLeverage(Number(e.target.value))}
                          sx={{ minWidth: 80, height: 26, fontSize: '0.75rem' }}>
                          {leverageOptions.map(l => <MenuItem key={l} value={l} sx={{ fontSize: '0.75rem' }}>1:{l}</MenuItem>)}
                        </Select>
                        <Typography variant="caption" fontWeight={600}>{fmt(margin)} {accountCurrency}</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Margine %:</Typography>
                        <TextField size="small" type="number" value={marginPercentage}
                          onChange={e => setMarginPercentage(Number(e.target.value))}
                          inputProps={{ min: 0.1, step: 0.1, style: { fontSize: '0.75rem' } }}
                          sx={{ width: 80, '& input': { padding: '3px 6px' } }} />
                        <Typography variant="caption" fontWeight={600}>{fmt(marginFromPercentage)} {accountCurrency}</Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Margine impegnato:</Typography>
                      <Chip
                        label={`${fmt(displayMargin)} ${accountCurrency}`}
                        size="small" color="warning" variant="outlined"
                      />
                    </Box>

                    {/* ── R:R e P&L atteso ───────────────────────────────── */}
                    {riskReward !== null && (
                      <>
                        <Divider sx={{ my: 0.25 }} />
                        <Row label="Risk/Reward:" value={`1 : ${riskReward.toFixed(2)}`}
                          valueColor={riskReward >= 2 ? 'success.main' : riskReward >= 1 ? 'warning.main' : 'error.main'} />
                      </>
                    )}
                    {expectedTp1 !== null && (
                      <Row
                        label="P&L atteso TP1:"
                        value={fmtPnl(expectedTp1, accountCurrency || quoteCurrency)}
                        valueColor="success.main"
                      />
                    )}
                    {expectedSl1 !== null && (
                      <Row
                        label="P&L atteso SL1:"
                        value={fmtPnl(expectedSl1, accountCurrency || quoteCurrency)}
                        valueColor="error.main"
                      />
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Grid2>

            {/* ── Stop Loss & Take Profit ──────────────────────────────── */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">Stop Loss & Take Profit</Typography>
                <ToggleButtonGroup value={slTpMode} exclusive onChange={handleModeChange} size="small">
                  <ToggleButton value="pips" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem' }}>Pips</ToggleButton>
                  <ToggleButton value="price" sx={{ px: 1.5, py: 0.5, fontSize: '0.72rem' }}>Prezzo</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Stack spacing={2}>
                {slTpMode === 'pips' ? (
                  <>
                    <TextField label="SL1 (Pips)" name="sl1_pips" type="number" value={formData.sl1_pips}
                      onChange={handleChange} fullWidth inputProps={{ min: 0 }} disabled={loading}
                      error={!!errors.sl1_pips}
                      helperText={errors.sl1_pips || (entry && sl1 > 0 ? `Prezzo: ${pipsToPrice(sl1, entry, true)}` : '')} />
                    <TextField label="TP1 (Pips)" name="tp1_pips" type="number" value={formData.tp1_pips}
                      onChange={handleChange} fullWidth inputProps={{ min: 0 }} disabled={loading}
                      error={!!errors.tp1_pips}
                      helperText={errors.tp1_pips || (entry && tp1 > 0 ? `Prezzo: ${pipsToPrice(tp1, entry, false)}` : '')} />
                    <TextField label="SL2 (Pips)" name="sl2_pips" type="number" value={formData.sl2_pips}
                      onChange={handleChange} fullWidth inputProps={{ min: 0 }} disabled={loading}
                      helperText={entry && (formData.sl2_pips ?? 0) > 0 ? `Prezzo: ${pipsToPrice(formData.sl2_pips ?? 0, entry, true)}` : ''} />
                    <TextField label="TP2 (Pips)" name="tp2_pips" type="number" value={formData.tp2_pips}
                      onChange={handleChange} fullWidth inputProps={{ min: 0 }} disabled={loading}
                      helperText={entry && (formData.tp2_pips ?? 0) > 0 ? `Prezzo: ${pipsToPrice(formData.tp2_pips ?? 0, entry, false)}` : ''} />
                  </>
                ) : (
                  <>
                    <TextField label="SL1 (Prezzo)" type="number" value={sl1Price}
                      onChange={e => handlePriceChange('sl1', e.target.value)} fullWidth
                      error={!!errors.sl1_pips}
                      helperText={errors.sl1_pips || (sl1 > 0 ? `${sl1.toFixed(1)} pips` : '')}
                      inputProps={{ step: pipSize }} disabled={loading} />
                    <TextField label="TP1 (Prezzo)" type="number" value={tp1Price}
                      onChange={e => handlePriceChange('tp1', e.target.value)} fullWidth
                      error={!!errors.tp1_pips}
                      helperText={errors.tp1_pips || (tp1 > 0 ? `${tp1.toFixed(1)} pips` : '')}
                      inputProps={{ step: pipSize }} disabled={loading} />
                    <TextField label="SL2 (Prezzo)" type="number" value={sl2Price}
                      onChange={e => handlePriceChange('sl2', e.target.value)} fullWidth
                      helperText={(formData.sl2_pips ?? 0) > 0 ? `${(formData.sl2_pips ?? 0).toFixed(1)} pips` : ''}
                      inputProps={{ step: pipSize }} disabled={loading} />
                    <TextField label="TP2 (Prezzo)" type="number" value={tp2Price}
                      onChange={e => handlePriceChange('tp2', e.target.value)} fullWidth
                      helperText={(formData.tp2_pips ?? 0) > 0 ? `${(formData.tp2_pips ?? 0).toFixed(1)} pips` : ''}
                      inputProps={{ step: pipSize }} disabled={loading} />
                  </>
                )}
              </Stack>
            </Grid2>

            {/* ── Risultato & Note ─────────────────────────────────────── */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Risultato & Note</Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={<Checkbox name="cancelled" checked={!!formData.cancelled} onChange={handleChange} disabled={loading} />}
                  label="Trade annullato"
                />
                {!formData.cancelled && (
                  <TextField
                    label="Profitto / Perdita" name="profit_or_loss" type="number"
                    value={formData.profit_or_loss} onChange={handleChange}
                    fullWidth disabled={loading} inputProps={{ step: 0.01 }}
                    helperText="Inserisci il P&L effettivo a chiusura (negativo per perdita)"
                  />
                )}
                <TextField
                  label="Note" name="comments" value={formData.comments}
                  onChange={handleChange} fullWidth multiline rows={4}
                  disabled={loading} placeholder="Motivazione del trade, lezioni apprese…"
                />
              </Stack>
            </Grid2>

            {/* ── Azioni ───────────────────────────────────────────────── */}
            <Grid2 size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              {errors.submit && <Typography color="error" sx={{ mb: 1 }}>{errors.submit}</Typography>}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleClose} variant="outlined" disabled={loading}>Annulla</Button>
                <Button type="submit" variant="contained" disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : undefined}>
                  {loading ? 'Salvataggio…' : 'Salva Trade'}
                </Button>
              </Stack>
            </Grid2>

          </Grid2>
        </form>
      </Box>
    </Modal>
  );
}

// ── Helper row ────────────────────────────────────────────────────────────────
function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" fontWeight={600} color={valueColor ?? 'text.primary'}>{value}</Typography>
    </Box>
  );
}
