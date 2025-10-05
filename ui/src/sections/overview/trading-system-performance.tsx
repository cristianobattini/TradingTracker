import { Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Box } from '@mui/material';

interface SystemPerformance {
  wins: number;
  losses: number;
  total: number;
  profit: number;
}

interface TradingSystemPerformanceProps {
  title: string;
  data: Record<string, SystemPerformance>;
}

export function TradingSystemPerformance({ title, data }: TradingSystemPerformanceProps) {
  const systems = Object.entries(data).map(([system, stats]) => ({
    system,
    ...stats,
    winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
    avgProfit: stats.total > 0 ? stats.profit / stats.total : 0,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader title={title} />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Trading System</TableCell>
              <TableCell align="center">Total Trades</TableCell>
              <TableCell align="center">Wins</TableCell>
              <TableCell align="center">Losses</TableCell>
              <TableCell align="center">Win Rate</TableCell>
              <TableCell align="center">Total Profit</TableCell>
              <TableCell align="center">Avg Profit/Trade</TableCell>
              <TableCell align="center">Performance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {systems.map((system) => (
              <TableRow key={system.system}>
                <TableCell>
                  <Box sx={{ fontWeight: 'medium' }}>
                    {system.system}
                  </Box>
                </TableCell>
                <TableCell align="center">{system.total}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={system.wins} 
                    color="success" 
                    variant="outlined"
                    size="small" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={system.losses} 
                    color="error" 
                    variant="outlined"
                    size="small" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={`${system.winRate.toFixed(1)}%`} 
                    color={system.winRate >= 50 ? 'success' : 'warning'}
                    size="small" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={formatCurrency(system.profit)} 
                    color={system.profit >= 0 ? 'success' : 'error'}
                    size="small" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={formatCurrency(system.avgProfit)} 
                    color={system.avgProfit >= 0 ? 'success' : 'error'}
                    variant="outlined"
                    size="small" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      backgroundColor: 'grey.200',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${system.winRate}%`,
                        height: '100%',
                        backgroundColor: system.winRate >= 50 ? 'success.main' : 'warning.main',
                      }}
                    />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}