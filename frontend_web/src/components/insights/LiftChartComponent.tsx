import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from '@/components/shared/ChartCard';
import type { LiftChartResponse } from '@/api/insights/types';

interface Props {
  data?: LiftChartResponse;
  loading?: boolean;
}

export function LiftChartComponent({ data, loading }: Props) {
  const bins = data?.bins.map((b, i) => ({
    bin: `${i + 1}`,
    actual: b.actual,
    predicted: b.predicted,
  })) ?? [];

  return (
    <ChartCard title="Lift Chart" subtitle="ビン別 実際値 vs 予測値" loading={loading}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={bins} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bin" label={{ value: 'Bin', position: 'bottom', offset: -4, fontSize: 11 }} />
          <YAxis tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip formatter={(v: number) => v.toFixed(4)} />
          <Legend />
          <Bar dataKey="predicted" fill="#2563eb" name="Predicted" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
