import { KPICard } from '@/components/shared/KPICard';
import { GaugeChart } from '@/components/shared/GaugeChart';
import type { AccuracyResponse } from '@/api/insights/types';

interface Props {
  data?: AccuracyResponse;
  loading?: boolean;
}

export function ModelSummaryCards({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const auc = data.metrics.find((m) => m.name === 'AUC');
  const f1 = data.metrics.find((m) => m.name === 'F1');
  const logLoss = data.metrics.find((m) => m.name === 'LogLoss');
  const accuracy = data.metrics.find((m) => m.name === 'Accuracy');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-8 justify-center">
        {auc && <GaugeChart value={auc.value} label="AUC" color="#2563eb" />}
        {f1 && <GaugeChart value={f1.value} label="F1 Score" color="#10b981" />}
        {accuracy && <GaugeChart value={accuracy.value} label="Accuracy" color="#8b5cf6" />}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.metrics.map((m) => (
          <KPICard
            key={m.name}
            label={m.name}
            value={m.value}
            sublabel={m.source}
            trend={m.name === data.optimizationMetric ? 'up' : 'neutral'}
          />
        ))}
      </div>
    </div>
  );
}
