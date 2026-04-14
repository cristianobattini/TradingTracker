import { Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { TradeResponse } from 'src/client';

interface TradingRecentTradesProps {
  title: string;
  trades: TradeResponse[];
}

function fmtPnl(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 5 });
}

export function TradingRecentTrades({ title, trades }: TradingRecentTradesProps) {
  return (
    <Card>
      <CardHeader title={title} />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Coppia</TableCell>
              <TableCell>Direzione</TableCell>
              <TableCell align="right">Lotti</TableCell>
              <TableCell align="right">Entry</TableCell>
              <TableCell align="right">SL1</TableCell>
              <TableCell align="right">TP1</TableCell>
              <TableCell>Sistema</TableCell>
              <TableCell>Rischio</TableCell>
              <TableCell align="right">P&L</TableCell>
              <TableCell>Stato</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id} hover>
                <TableCell>{trade.date}</TableCell>
                <TableCell>{trade.pair ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={trade.action}
                    color={trade.action === 'BUY' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{trade.lots ?? '—'}</TableCell>
                <TableCell align="right">{fmtPrice(trade.entry)}</TableCell>
                <TableCell align="right">
                  {trade.sl1_pips ? `${trade.sl1_pips} pip` : '—'}
                </TableCell>
                <TableCell align="right">
                  {trade.tp1_pips ? `${trade.tp1_pips} pip` : '—'}
                </TableCell>
                <TableCell>{trade.system ?? '—'}</TableCell>
                <TableCell>{trade.risk ?? '—'}</TableCell>
                <TableCell align="right">
                  {trade.cancelled ? (
                    <Chip label="—" size="small" color="default" variant="outlined" />
                  ) : (
                    <Chip
                      label={fmtPnl(trade.profit_or_loss)}
                      color={
                        (trade.profit_or_loss ?? 0) > 0 ? 'success'
                        : (trade.profit_or_loss ?? 0) < 0 ? 'error'
                        : 'default'
                      }
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={trade.cancelled ? 'Annullato' : 'Eseguito'}
                    color={trade.cancelled ? 'warning' : 'primary'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
