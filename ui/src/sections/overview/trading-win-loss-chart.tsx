import { Card, CardHeader } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TradingWinLossChartProps {
  title: string;
  data: {
    win: number;
    loss: number;
    cancelled: number;
  };
}

const COLORS = ['#00C49F', '#FF8042', '#FFBB28'];

export function TradingWinLossChart({ title, data }: TradingWinLossChartProps) {
  const chartData = [
    { name: 'Winning Trades', value: data.win },
    { name: 'Losing Trades', value: data.loss },
    { name: 'Cancelled Trades', value: data.cancelled },
  ];

  return (
    <Card>
      <CardHeader title={title} />
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props) => {
              const { name, percent } = props as unknown as { name: string; percent: number };
              return `${name} ${(percent * 100).toFixed(0)}%`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}