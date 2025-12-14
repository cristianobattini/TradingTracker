import { Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { TradeResponse } from 'src/client';

interface TradingRecentTradesProps {
  title: string;
  trades: TradeResponse[];
}

export function TradingRecentTrades({ title, trades }: TradingRecentTradesProps) {
  return (
    <Card>
      <CardHeader title={title} />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Pair</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>System</TableCell>
              <TableCell>Risk</TableCell>
              <TableCell>P&L</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>{trade.date}</TableCell>
                <TableCell>{trade.pair}</TableCell>
                <TableCell>
                  <Chip 
                    label={trade.action} 
                    color={trade.action === 'BUY' ? 'success' : 'error'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>{trade.system}</TableCell>
                <TableCell>{trade.risk}</TableCell>
                <TableCell>
                  <Chip 
                    label={`$${trade.profit_or_loss}`} 
                    color={trade.profit_or_loss ? (trade.profit_or_loss > 0 ? 'success' : trade.profit_or_loss < 0 ? 'error' : 'default') : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={trade.cancelled ? 'Cancelled' : 'Executed'} 
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