import { Card, CardHeader, Stack, Typography, Box } from '@mui/material';
import { fNumber } from 'src/utils/format-number';

interface TradingPerformanceSummaryProps {
  title: string;
  value: number;
  currency?: string;
  suffix?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  icon: React.ReactNode;
}

export function TradingPerformanceSummary({
  title,
  value,
  currency = '',
  suffix = '',
  color = 'primary',
  icon,
}: TradingPerformanceSummaryProps) {
  return (
    <Card>
      <CardHeader title={title} />
      <Stack spacing={2} sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}.light`,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h4">
            {currency}
            {fNumber(value)}
            {suffix}
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}
