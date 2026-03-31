import { useState, useMemo } from 'react';
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

const BIN_OPTIONS = [10, 20, 30] as const;

function aggregateBins(
  rawBins: LiftChartResponse['bins'],
  targetCount: number,
) {
  if (rawBins.length <= targetCount) {
    return rawBins.map((b, i) => ({
      bin: `${i + 1}`,
      actual: b.actual,
      predicted: b.predicted,
    }));
  }

  const chunkSize = rawBins.length / targetCount;
  const result: { bin: string; actual: number; predicted: number }[] = [];

  for (let i = 0; i < targetCount; i++) {
    const start = Math.round(i * chunkSize);
    const end = Math.round((i + 1) * chunkSize);
    const slice = rawBins.slice(start, end);
    const totalWeight = slice.reduce((s, b) => s + (b.binWeight ?? 1), 0);
    const weightedActual =
      totalWeight > 0
        ? slice.reduce((s, b) => s + b.actual * (b.binWeight ?? 1), 0) / totalWeight
        : 0;
    const weightedPredicted =
      totalWeight > 0
        ? slice.reduce((s, b) => s + b.predicted * (b.binWeight ?? 1), 0) / totalWeight
        : 0;
    result.push({
      bin: `${i + 1}`,
      actual: weightedActual,
      predicted: weightedPredicted,
    });
  }
  return result;
}

export function LiftChartComponent({ data, loading }: Props) {
  const [binCount, setBinCount] = useState<number>(10);

  const bins = useMemo(
    () => (data ? aggregateBins(data.bins, binCount) : []),
    [data, binCount],
  );

  return (
    <ChartCard
      title="Lift Chart"
      subtitle="ビン別 実際値 vs 予測値"
      loading={loading}
      action={
        <div className="flex items-center gap-1">
          {BIN_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setBinCount(n)}
              className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                binCount === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      }
    >
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
