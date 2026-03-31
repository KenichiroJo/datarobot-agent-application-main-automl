import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from '@/components/shared/ChartCard';
import type { FeatureEffectsResponse } from '@/api/insights/types';

interface Props {
  data?: FeatureEffectsResponse;
  loading?: boolean;
}

export function FeatureEffectsChart({ data, loading }: Props) {
  const points = data?.partialDependence.map((p) => ({
    label: p.label,
    dependence: p.dependence,
  })) ?? [];

  return (
    <ChartCard
      title="Feature Effects"
      subtitle={data ? `${data.featureName} (${data.featureType})` : ''}
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            label={{ value: data?.featureName ?? '', position: 'bottom', offset: 8, fontSize: 11 }}
          />
          <YAxis tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip formatter={(v: number) => v.toFixed(4)} />
          <Line type="monotone" dataKey="dependence" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
