import { Card, CardHeader } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TradingPairsDistributionProps {
  title: string;
  data: Record<string, number>;
}

export function TradingPairsDistribution({ title, data }: TradingPairsDistributionProps) {
  const chartData = Object.entries(data).map(([pair, count]) => ({
    pair,
    count,
  }));

  return (
    <Card>
      <CardHeader title={title} />
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="pair" 
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value: number) => [value, 'Number of Trades']}
          />
          <Legend />
          <Bar 
            dataKey="count" 
            fill="#82ca9d" 
            name="Trade Count"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}