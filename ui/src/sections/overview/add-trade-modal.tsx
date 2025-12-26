import React, { useState } from 'react';
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
import { createTradeApiTradesPost, TradeCreate, TradeResponse } from 'src/client';

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
  width: 800,
  maxWidth: '95vw',
  maxHeight: '90vh',
  overflow: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const currencyPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'EUR/CAD', 'GBP/CAD'];
const tradingSystems = ['30min', '1hr', '4hr', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
const riskLevels = ['0.25%', '0.5%', '1%', '1.5%', '2%', '3%', '5%'];

export function AddTradeModal({ open, onClose, onTradeAdded, loading = false }: AddTradeModalProps) {
  const [formData, setFormData] = useState<TradeCreate>({
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.pair) newErrors.pair = 'Currency pair is required';
    if (!formData.system) newErrors.system = 'Trading system is required';
    if (!formData.entry || formData.entry <= 0) newErrors.entry = 'Entry price must be positive';
    if (!formData.lots || formData.lots <= 0) newErrors.lots = 'Lot size must be positive';
    if (!formData.sl1_pips || formData.sl1_pips <= 0) newErrors.sl1_pips = 'SL1 must be positive';
    if (!formData.tp1_pips || formData.tp1_pips <= 0) newErrors.tp1_pips = 'TP1 must be positive';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const trade: TradeCreate = { ...formData, profit_or_loss: formData.cancelled ? 0 : formData.profit_or_loss };
      const response = await createTradeApiTradesPost({ body: trade });
      if (response.data) onTradeAdded(response.data);
      handleClose();
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Failed to add trade. Please try again.' });
    }
  };

  const handleClose = () => {
    setFormData({
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
    setErrors({});
    onClose();
  };

  const calculatePipValue = () => (formData.lots * 10).toFixed(2);

  return (
    <Modal open={open} onClose={handleClose} aria-labelledby="add-trade-modal-title">
      <Box sx={modalStyle}>
        <Typography id="add-trade-modal-title" variant="h5" gutterBottom>Add New Trade</Typography>
        <Divider sx={{ mb: 3 }} />
        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={3}>
            {/* Basic Info */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <Stack spacing={2}>
                <TextField
                  required type="date" name="date" label="Trade Date"
                  value={formData.date} onChange={handleChange} fullWidth
                  error={!!errors.date} helperText={errors.date}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                />
                <FormControl fullWidth required error={!!errors.pair} disabled={loading}>
                  <InputLabel>Currency Pair</InputLabel>
                  <Select name="pair" value={formData.pair} onChange={handleSelectChange}>
                    {currencyPairs.map(pair => <MenuItem key={pair} value={pair}>{pair}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth required error={!!errors.system} disabled={loading}>
                  <InputLabel>Trading System</InputLabel>
                  <Select name="system" value={formData.system} onChange={handleSelectChange}>
                    {tradingSystems.map(system => <MenuItem key={system} value={system}>{system}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth required disabled={loading}>
                  <InputLabel>Action</InputLabel>
                  <Select name="action" value={formData.action} onChange={handleSelectChange}>
                    <MenuItem value="BUY"><Chip label="BUY" color="success" size="small"/></MenuItem>
                    <MenuItem value="SELL"><Chip label="SELL" color="error" size="small"/></MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Grid2>

            {/* Risk & Entry */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Risk & Entry</Typography>
              <Stack spacing={2}>
                <FormControl fullWidth required disabled={loading}>
                  <InputLabel>Risk Level</InputLabel>
                  <Select name="risk" value={formData.risk} onChange={handleSelectChange}>
                    {riskLevels.map(risk => <MenuItem key={risk} value={risk}>{risk}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Lot Size" name="lots" type="number" value={formData.lots} onChange={handleChange}
                  fullWidth error={!!errors.lots} helperText={errors.lots || `Pip value: $${calculatePipValue()}`} inputProps={{ min: 0.01, step: 0.01 }} disabled={loading} />
                <TextField label="Entry Price" name="entry" type="number" value={formData.entry} onChange={handleChange}
                  fullWidth error={!!errors.entry} helperText={errors.entry} inputProps={{ step: 0.0001 }} disabled={loading} />
              </Stack>
            </Grid2>

            {/* SL/TP */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Stop Loss & Take Profit</Typography>
              <Stack spacing={2}>
                <TextField label="SL1 (Pips)" name="sl1_pips" type="number" value={formData.sl1_pips} onChange={handleChange} fullWidth
                  error={!!errors.sl1_pips} helperText={errors.sl1_pips} inputProps={{ min: 0 }} disabled={loading}/>
                <TextField label="TP1 (Pips)" name="tp1_pips" type="number" value={formData.tp1_pips} onChange={handleChange} fullWidth
                  error={!!errors.tp1_pips} helperText={errors.tp1_pips} inputProps={{ min: 0 }} disabled={loading}/>
                <TextField label="SL2 (Pips)" name="sl2_pips" type="number" value={formData.sl2_pips} onChange={handleChange} fullWidth
                  inputProps={{ min: 0 }} disabled={loading}/>
                <TextField label="TP2 (Pips)" name="tp2_pips" type="number" value={formData.tp2_pips} onChange={handleChange} fullWidth
                  inputProps={{ min: 0 }} disabled={loading}/>
              </Stack>
            </Grid2>

            {/* Banking & Commission */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Banking & Commission</Typography>
              <Stack spacing={2}>
                <TextField label="Instrument Name" name="instrument_name" value={formData.instrument_name} onChange={handleChange} fullWidth disabled={loading} />
                <TextField label="ISIN" name="isin" value={formData.isin} onChange={handleChange} fullWidth disabled={loading} />
                <TextField label="Currency" name="currency" value={formData.currency} onChange={handleChange} fullWidth disabled={loading} />
                <TextField label="Operation Type" name="operation_type" value={formData.operation_type} onChange={handleChange} fullWidth disabled={loading} />
                <TextField label="Sign" name="sign" value={formData.sign} onChange={handleChange} fullWidth disabled={loading} />
                <TextField label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} fullWidth disabled={loading} inputProps={{ step: 0.01 }} />
                <TextField label="Exchange Rate" name="exchange_rate" type="number" value={formData.exchange_rate} onChange={handleChange} fullWidth disabled={loading} inputProps={{ step: 0.0001 }} />
                <TextField label="Gross Amount" name="gross_amount" type="number" value={formData.gross_amount} onChange={handleChange} fullWidth disabled={loading} inputProps={{ step: 0.01 }} />
                <TextField label="Commission Fund" name="commission_fund" type="number" value={formData.commission_fund} onChange={handleChange} fullWidth disabled={loading} inputProps={{ step: 0.01 }} />
                <TextField label="Commission Bank" name="commission_bank" type="number" value={formData.commission_bank} onChange={handleChange} fullWidth disabled={loading} inputProps={{ step: 0.01 }} />
                <TextField label="Commission SGR" name="commission_sgr" type="number" value={formData.commission_sgr} onChange={handleChange} fullWidth disabled={loading} inputProps={{ step: 0.01 }} />
                <TextField label="Commission Admin" name="commission_admin" type="number" value={formData.commission_admin} onChange={handleChange} fullWidth disabled={loading} inputProps={{ step: 0.01 }} />
              </Stack>
            </Grid2>

            {/* Trade Results */}
            <Grid2 size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleClose} variant="outlined" disabled={loading}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading} startIcon={loading && <CircularProgress size={20} />}>
                  {loading ? 'Adding Trade...' : 'Add Trade'}
                </Button>
              </Stack>
            </Grid2>
          </Grid2>
        </form>
      </Box>
    </Modal>
  );
}
