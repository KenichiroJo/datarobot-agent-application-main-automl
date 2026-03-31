import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from '@/components/shared/ChartCard';
import type { ROCCurveResponse } from '@/api/insights/types';

interface Props {
  data?: ROCCurveResponse;
  loading?: boolean;
}

export function ROCCurveChart({ data, loading }: Props) {
  const points = data?.rocPoints.map((p) => ({
    fpr: p.falsePositiveRate,
    tpr: p.truePositiveRate,
  })) ?? [];

  return (
    <ChartCard
      title="ROC Curve"
      subtitle={data ? `AUC = ${data.auc.toFixed(4)}` : 'ROC曲線'}
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            label={{ value: 'False Positive Rate', position: 'bottom', offset: 8, fontSize: 11 }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <YAxis
            dataKey="tpr"
            type="number"
            domain={[0, 1]}
            label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 11 }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            formatter={(value: number) => [value.toFixed(4)]}
            labelFormatter={(label: number) => `FPR: ${label.toFixed(4)}`}
          />
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
            stroke="#94a3b8"
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="tpr"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
