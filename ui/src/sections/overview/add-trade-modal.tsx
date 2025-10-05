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
  Alert,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Divider,
  Grid2,
  Chip,
} from '@mui/material';
import { createTradeTradesPost, TradeCreate, TradeResponse } from 'src/client';

interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onTradeAdded: (trade: TradeResponse) => void;
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
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',
  'EUR/GBP',
  'EUR/JPY',
  'GBP/JPY',
  'AUD/JPY',
  'EUR/CAD',
  'GBP/CAD',
];

const tradingSystems = [
  'Trend Following',
  'Mean Reversion',
  'Breakout',
  'Scalping',
  'Swing Trading',
  'Position Trading',
  'Carry Trade',
  'Arbitrage',
];

const riskLevels = ['0.25%', '0.5%', '1%', '1.5%', '2%', '3%', '5%'];

export function AddTradeModal({
  open,
  onClose,
  onTradeAdded,
  loading = false,
}: AddTradeModalProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date as default
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-calculate risk_percent when risk changes
    if (name === 'risk') {
      const riskPercent = parseFloat(value.replace('%', ''));
      setFormData((prev) => ({
        ...prev,
        risk_percent: riskPercent,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

    const newTrade: TradeCreate = {
        ...formData,
        profit_or_loss: formData.cancelled ? 0 : formData.profit_or_loss,
    };

    createTradeTradesPost({ body: newTrade })
      .then((response) => {
        if (response.data) {
          onTradeAdded(response.data);
        }
        handleClose();
      })
      .catch((error) => {
        console.error('Error adding trade:', error);
        setErrors({ submit: 'Failed to add trade. Please try again.' });
      });
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
    });
    setErrors({});
    onClose();
  };

  const calculatePipValue = () => {
    // Simplified pip value calculation
    // In real trading, this would be more complex based on the pair and lot size
    const pipValue = formData.lots * 10; // $10 per lot for most pairs
    return pipValue.toFixed(2);
  };

  return (
    <Modal open={open} onClose={handleClose} aria-labelledby="add-trade-modal-title">
      <Box sx={modalStyle}>
        <Typography id="add-trade-modal-title" variant="h5" component="h2" gutterBottom>
          Add New Trade
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={3}>
            {/* Basic Trade Information */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Basic Information
              </Typography>

              <Stack spacing={2}>
                <TextField
                  required
                  label="Trade Date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  error={!!errors.date}
                  helperText={errors.date}
                  InputLabelProps={{ shrink: true }}
                />

                <FormControl fullWidth required error={!!errors.pair} disabled={loading}>
                  <InputLabel>Currency Pair</InputLabel>
                  <Select
                    name="pair"
                    value={formData.pair}
                    label="Currency Pair"
                    onChange={handleSelectChange}
                  >
                    {currencyPairs.map((pair) => (
                      <MenuItem key={pair} value={pair}>
                        {pair}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.pair && (
                    <Typography variant="caption" color="error">
                      {errors.pair}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth required error={!!errors.system} disabled={loading}>
                  <InputLabel>Trading System</InputLabel>
                  <Select
                    name="system"
                    value={formData.system}
                    label="Trading System"
                    onChange={handleSelectChange}
                  >
                    {tradingSystems.map((system) => (
                      <MenuItem key={system} value={system}>
                        {system}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.system && (
                    <Typography variant="caption" color="error">
                      {errors.system}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth required disabled={loading}>
                  <InputLabel>Action</InputLabel>
                  <Select
                    name="action"
                    value={formData.action}
                    label="Action"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="BUY">
                      <Chip label="BUY" color="success" size="small" />
                    </MenuItem>
                    <MenuItem value="SELL">
                      <Chip label="SELL" color="error" size="small" />
                    </MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Grid2>

            {/* Risk Management */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Risk Management
              </Typography>

              <Stack spacing={2}>
                <FormControl fullWidth required disabled={loading}>
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    name="risk"
                    value={formData.risk}
                    label="Risk Level"
                    onChange={handleSelectChange}
                  >
                    {riskLevels.map((risk) => (
                      <MenuItem key={risk} value={risk}>
                        {risk}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  required
                  label="Lot Size"
                  name="lots"
                  type="number"
                  value={formData.lots}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  error={!!errors.lots}
                  helperText={errors.lots || `Pip value: $${calculatePipValue()}`}
                  inputProps={{ min: 0.01, step: 0.01 }}
                />

                <TextField
                  required
                  label="Entry Price"
                  name="entry"
                  type="number"
                  value={formData.entry}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  error={!!errors.entry}
                  helperText={errors.entry}
                  inputProps={{ step: 0.0001 }}
                />
              </Stack>
            </Grid2>

            {/* Stop Loss & Take Profit */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Stop Loss & Take Profit
              </Typography>

              <Stack spacing={2}>
                <TextField
                  required
                  label="SL1 (Pips)"
                  name="sl1_pips"
                  type="number"
                  value={formData.sl1_pips}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  error={!!errors.sl1_pips}
                  helperText={errors.sl1_pips}
                  inputProps={{ min: 0 }}
                />

                <TextField
                  required
                  label="TP1 (Pips)"
                  name="tp1_pips"
                  type="number"
                  value={formData.tp1_pips}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  error={!!errors.tp1_pips}
                  helperText={errors.tp1_pips}
                  inputProps={{ min: 0 }}
                />

                <TextField
                  label="SL2 (Pips)"
                  name="sl2_pips"
                  type="number"
                  value={formData.sl2_pips}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  inputProps={{ min: 0 }}
                />

                <TextField
                  label="TP2 (Pips)"
                  name="tp2_pips"
                  type="number"
                  value={formData.tp2_pips}
                  onChange={handleChange}
                  fullWidth
                  disabled={loading}
                  inputProps={{ min: 0 }}
                />
              </Stack>
            </Grid2>

            {/* Trade Results & Comments */}
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Trade Results
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="cancelled"
                      checked={formData.cancelled}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  }
                  label="Trade Cancelled"
                />

                {!formData.cancelled && (
                  <TextField
                    label="Profit/Loss ($)"
                    name="profit_or_loss"
                    type="number"
                    value={formData.profit_or_loss}
                    onChange={handleChange}
                    fullWidth
                    disabled={loading}
                    inputProps={{ step: 0.01 }}
                  />
                )}

                <TextField
                  label="Comments"
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={3}
                  disabled={loading}
                  placeholder="Enter trade notes, observations, or lessons learned..."
                />
              </Stack>
            </Grid2>

            {/* Action Buttons */}
            <Grid2 size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={handleClose} disabled={loading} variant="outlined" color="inherit">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} />}
                >
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
