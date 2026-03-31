import type { PredictionResponse } from '@/api/predictions/types';
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

interface Props {
  data?: PredictionResponse;
  loading?: boolean;
}

export function PredictionCard({ data, loading }: Props) {
  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-80" />;
  }

  if (!data) return null;

  const probability = data.predictionProbability * 100;
  const isHighRisk = probability > 50;

  const explanations = data.explanations.slice(0, 10).map((e) => ({
    name:
      e.featureName.length > 20 ? e.featureName.slice(0, 18) + '…' : e.featureName,
    fullName: e.featureName,
    strength: e.strength,
    value: e.featureValue,
    qs: e.qualitativeStrength,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">予測結果</h3>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isHighRisk
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}
        >
          {isHighRisk ? 'High Risk' : 'Low Risk'}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">{probability.toFixed(1)}%</span>
        <span className="text-sm text-muted-foreground">
          予測: {data.prediction}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(data.classProbabilities).map(([cls, prob]) => (
          <div key={cls} className="rounded-lg bg-muted/50 p-2">
            <span className="text-muted-foreground">Class {cls}:</span>{' '}
            <span className="font-semibold">{(prob * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {explanations.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">特徴量説明（影響度）</h4>
          <ResponsiveContainer width="100%" height={Math.max(200, explanations.length * 28)}>
            <BarChart
              data={explanations}
              layout="vertical"
              margin={{ left: 100, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number, _name: string, entry: any) => [
                  `${value.toFixed(4)} (${entry.payload.qs})`,
                  entry.payload.fullName,
                ]}
              />
              <Bar dataKey="strength" radius={[0, 4, 4, 0]}>
                {explanations.map((e, i) => (
                  <Cell key={i} fill={e.strength > 0 ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
