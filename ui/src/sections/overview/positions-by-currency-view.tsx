import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Chip,
  Paper,
} from '@mui/material';
import { positionApi, PositionsByCurrency } from 'src/services/analysis-api';

export function PositionsByCurrencyView() {
  const [data, setData] = useState<PositionsByCurrency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await positionApi.getPositionsByCurrency();
      setData(result);
    } catch (err: any) {
      console.error('Error loading positions by currency:', err);
      setError(err?.message || 'Impossibile caricare le posizioni');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">Nessun dato di posizione disponibile</Alert>
    );
  }

  const currencies = Object.entries(data.positions_by_currency);

  return (
    <Card>
      <CardHeader
        title="Posizioni per Valuta"
        subheader={`Valuta conto: ${data.account_currency}`}
        action={
          <Chip
            label={`Total P&L: ${data.total_pnl.toFixed(2)} ${data.account_currency}`}
            color={data.total_pnl >= 0 ? 'success' : 'error'}
            variant="outlined"
          />
        }
      />
      <CardContent>
        {currencies.length === 0 ? (
          <Typography color="text.secondary">Nessun trade ancora</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {currencies.map(([currency, position]) => (
              <Paper key={currency} sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">
                    {currency}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`${position.count} trades`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`P&L: ${position.total.toFixed(2)} ${data.account_currency}`}
                      size="small"
                      color={position.total >= 0 ? 'success' : 'error'}
                    />
                  </Box>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#e0e0e0' }}>
                        <TableCell>ID Trade</TableCell>
                        <TableCell>Coppia</TableCell>
                        <TableCell align="right">P&L ({currency})</TableCell>
                        <TableCell align="right">P&L ({data.account_currency})</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {position.trades.map((trade: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{trade.trade_id || '-'}</TableCell>
                          <TableCell>{trade.pair || '-'}</TableCell>
                          <TableCell align="right">
                            {trade.pnl_original?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{
                                color:
                                  (trade.pnl_in_account || 0) >= 0 ? '#4caf50' : '#f44336',
                                fontWeight: 'bold',
                              }}
                            >
                              {trade.pnl_in_account?.toFixed(2) || '0.00'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
