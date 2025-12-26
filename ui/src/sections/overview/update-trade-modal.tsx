import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { updateTradeApiTradesTradeIdPut, TradeResponse, TradeUpdate } from 'src/client';

interface UpdateTradeModalProps {
  open: boolean;
  onClose: () => void;
  trade: TradeResponse | null;
  onTradeUpdated: (trade: TradeResponse) => void;
  loading?: boolean;
}

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 800,
  maxWidth: '95vw',
  maxHeight: '90vh',
  overflow: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const currencyPairs = [
  'EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','USD/CAD','NZD/USD',
  'EUR/GBP','EUR/JPY','GBP/JPY','AUD/JPY','EUR/CAD','GBP/CAD',
];

const tradingSystems = ['30min','1hr','4hr','Daily','Weekly','Monthly','Yearly'];

const riskLevels = ['0.25%','0.5%','1%','1.5%','2%','3%','5%'];

export function UpdateTradeModal({
  open,
  onClose,
  trade,
  onTradeUpdated,
  loading = false,
}: UpdateTradeModalProps) {
  const [formData, setFormData] = useState({
    id: undefined as number | undefined,
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (trade) {
      setFormData({
        id: trade.id,
        date: trade.date ?? new Date().toISOString().split('T')[0],
        pair: trade.pair ?? '',
        system: trade.system ?? '',
        action: trade.action ?? 'BUY',
        risk: trade.risk ?? '1%',
        risk_percent: trade.risk_percent ?? 1,
        lots: trade.lots ?? 0.1,
        entry: trade.entry ?? 0,
        sl1_pips: trade.sl1_pips ?? 0,
        tp1_pips: trade.tp1_pips ?? 0,
        sl2_pips: trade.sl2_pips ?? 0,
        tp2_pips: trade.tp2_pips ?? 0,
        cancelled: trade.cancelled ?? false,
        profit_or_loss: trade.profit_or_loss ?? 0,
        comments: trade.comments ?? '',
      });
    }
  }, [trade]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'risk' ? { risk_percent: parseFloat(value.replace('%','')) } : {})
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string,string> = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.pair) newErrors.pair = 'Currency pair is required';
    if (!formData.system) newErrors.system = 'Trading system is required';
    if (!formData.entry || formData.entry <= 0) newErrors.entry = 'Valid entry price is required';
    if (formData.lots <= 0) newErrors.lots = 'Valid lot size is required';
    if (formData.sl1_pips <= 0) newErrors.sl1_pips = 'Stop loss pips must be positive';
    if (formData.tp1_pips <= 0) newErrors.tp1_pips = 'Take profit pips must be positive';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!formData.id) return setErrors({ submit: 'Trade id missing. Cannot update.' });

    const updateBody: TradeUpdate = {
      symbol: formData.pair,
      system: formData.system,
      entry_price: formData.entry,
      quantity: formData.lots,
      position_type: formData.action,
      sl1_pips: formData.sl1_pips,
      tp1_pips: formData.tp1_pips,
      sl2_pips: formData.sl2_pips,
      tp2_pips: formData.tp2_pips,
      risk: formData.risk,
      risk_percent: formData.risk_percent,
      cancelled: formData.cancelled,
      profit_or_loss: formData.cancelled ? 0 : formData.profit_or_loss,
      comments: formData.comments,
      date: formData.date,
    };

    updateTradeApiTradesTradeIdPut({ path: { trade_id: formData.id }, body: updateBody })
      .then(res => {
        if (res.data) onTradeUpdated(res.data);
        handleClose();
      })
      .catch(err => setErrors({ submit: 'Failed to update trade. Please try again.' }));
  };

  const handleClose = () => {
    setFormData({
      id: undefined,
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
    });
    setErrors({});
    onClose();
  };

  const calculatePipValue = () => (formData.lots * 10).toFixed(2);

  return (
    <Modal open={open} onClose={handleClose} aria-labelledby="update-trade-modal-title">
      <Box sx={modalStyle}>
        <Typography id="update-trade-modal-title" variant="h5" component="h2" gutterBottom>
          Update Trade
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={3}>
            {/* Basic Info */}
            <Grid2 size={{ xs: 12, md:6 }}>
              <Typography variant="h6" gutterBottom color="primary">Basic Information</Typography>
              <Stack spacing={2}>
                <TextField type="date" label="Trade Date" name="date" value={formData.date} onChange={handleChange} fullWidth InputLabelProps={{shrink:true}} disabled={loading} error={!!errors.date} helperText={errors.date} />
                <FormControl fullWidth error={!!errors.pair} disabled={loading}>
                  <InputLabel>Currency Pair</InputLabel>
                  <Select name="pair" value={formData.pair} onChange={handleSelectChange} label="Currency Pair">
                    {currencyPairs.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                  {errors.pair && <Typography variant="caption" color="error">{errors.pair}</Typography>}
                </FormControl>
                <FormControl fullWidth error={!!errors.system} disabled={loading}>
                  <InputLabel>Trading System</InputLabel>
                  <Select name="system" value={formData.system} onChange={handleSelectChange} label="Trading System">
                    {tradingSystems.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                  {errors.system && <Typography variant="caption" color="error">{errors.system}</Typography>}
                </FormControl>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Action</InputLabel>
                  <Select name="action" value={formData.action} onChange={handleSelectChange} label="Action">
                    <MenuItem value="BUY"><Chip label="BUY" color="success" size="small"/></MenuItem>
                    <MenuItem value="SELL"><Chip label="SELL" color="error" size="small"/></MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Grid2>

            {/* Risk */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom color="primary">Risk Management</Typography>
              <Stack spacing={2}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Risk Level</InputLabel>
                  <Select name="risk" value={formData.risk} onChange={handleSelectChange} label="Risk Level">
                    {riskLevels.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Lot Size" type="number" name="lots" value={formData.lots} onChange={handleChange} fullWidth disabled={loading} inputProps={{min:0.01, step:0.01}} helperText={`Pip value: $${calculatePipValue()}`} error={!!errors.lots}/>
                <TextField label="Entry Price" type="number" name="entry" value={formData.entry} onChange={handleChange} fullWidth disabled={loading} inputProps={{step:0.0001}} error={!!errors.entry} helperText={errors.entry}/>
              </Stack>
            </Grid2>

            {/* SL & TP */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom color="primary">Stop Loss & Take Profit</Typography>
              <Stack spacing={2}>
                <TextField label="SL1 (Pips)" type="number" name="sl1_pips" value={formData.sl1_pips} onChange={handleChange} fullWidth inputProps={{min:0}} disabled={loading} error={!!errors.sl1_pips} helperText={errors.sl1_pips}/>
                <TextField label="TP1 (Pips)" type="number" name="tp1_pips" value={formData.tp1_pips} onChange={handleChange} fullWidth inputProps={{min:0}} disabled={loading} error={!!errors.tp1_pips} helperText={errors.tp1_pips}/>
                <TextField label="SL2 (Pips)" type="number" name="sl2_pips" value={formData.sl2_pips} onChange={handleChange} fullWidth inputProps={{min:0}} disabled={loading}/>
                <TextField label="TP2 (Pips)" type="number" name="tp2_pips" value={formData.tp2_pips} onChange={handleChange} fullWidth inputProps={{min:0}} disabled={loading}/>
              </Stack>
            </Grid2>

            {/* Results & Comments */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom color="primary">Trade Results</Typography>
              <Stack spacing={2}>
                <FormControlLabel control={<Checkbox name="cancelled" checked={formData.cancelled} onChange={handleChange} disabled={loading}/>} label="Trade Cancelled"/>
                {!formData.cancelled && <TextField label="Profit/Loss ($)" name="profit_or_loss" type="number" value={formData.profit_or_loss} onChange={handleChange} fullWidth disabled={loading} inputProps={{step:0.01}} />}
                <TextField label="Comments" name="comments" value={formData.comments} onChange={handleChange} fullWidth multiline rows={3} disabled={loading} placeholder="Enter trade notes or lessons learned..."/>
              </Stack>
            </Grid2>

            {/* Actions */}
            <Grid2 size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }}/>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleClose} disabled={loading} variant="outlined">Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading} startIcon={loading && <CircularProgress size={20}/>}>
                  {loading ? 'Updating Trade...' : 'Update Trade'}
                </Button>
              </Stack>
              {errors.submit && <Typography color="error" mt={2}>{errors.submit}</Typography>}
            </Grid2>
          </Grid2>
        </form>
      </Box>
    </Modal>
  );
}
