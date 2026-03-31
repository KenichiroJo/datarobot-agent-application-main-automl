import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartCard } from '@/components/shared/ChartCard';
import type { FeatureImpactResponse } from '@/api/insights/types';

interface Props {
  data?: FeatureImpactResponse;
  loading?: boolean;
}

export function FeatureImpactChart({ data, loading }: Props) {
  const features = data?.features.slice(0, 15).map((f) => ({
    name: f.featureName.length > 20 ? f.featureName.slice(0, 18) + '…' : f.featureName,
    fullName: f.featureName,
    impact: f.impactNormalized,
  })) ?? [];

  return (
    <ChartCard title="Feature Impact" subtitle="特徴量の重要度（上位15件）" loading={loading}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={features} layout="vertical" margin={{ left: 100, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Impact']}
            labelFormatter={(_: any, payload: any[]) => payload?.[0]?.payload?.fullName ?? ''}
          />
          <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
            {features.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#2563eb' : i < 5 ? '#3b82f6' : '#93c5fd'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
