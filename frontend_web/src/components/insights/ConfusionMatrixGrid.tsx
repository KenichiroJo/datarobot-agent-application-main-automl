import { ChartCard } from '@/components/shared/ChartCard';
import type { ConfusionMatrixResponse } from '@/api/insights/types';

interface Props {
  data?: ConfusionMatrixResponse;
  loading?: boolean;
}

export function ConfusionMatrixGrid({ data, loading }: Props) {
  if (!data) return <ChartCard title="Confusion Matrix" loading={loading}><div /></ChartCard>;

  const [[tn, fp], [fn, tp]] = data.matrix;
  const total = tn + fp + fn + tp;

  const cells = [
    { label: 'TN', value: tn, pct: ((tn / total) * 100).toFixed(1), bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'FP', value: fp, pct: ((fp / total) * 100).toFixed(1), bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'FN', value: fn, pct: ((fn / total) * 100).toFixed(1), bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'TP', value: tp, pct: ((tp / total) * 100).toFixed(1), bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  ];

  return (
    <ChartCard
      title="Confusion Matrix"
      subtitle={`Threshold: ${data.threshold.toFixed(2)}`}
      loading={loading}
    >
      <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-4">
        {cells.map((c) => (
          <div key={c.label} className={`${c.bg} rounded-lg p-4 text-center`}>
            <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
            <div className="text-xl font-bold text-foreground">{c.value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{c.pct}%</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div>
          <span className="text-muted-foreground">Precision</span>
          <div className="font-semibold">{(data.metrics.precision * 100).toFixed(1)}%</div>
        </div>
        <div>
          <span className="text-muted-foreground">Recall</span>
          <div className="font-semibold">{(data.metrics.recall * 100).toFixed(1)}%</div>
        </div>
        <div>
          <span className="text-muted-foreground">F1</span>
          <div className="font-semibold">{(data.metrics.f1 * 100).toFixed(1)}%</div>
        </div>
        <div>
          <span className="text-muted-foreground">Accuracy</span>
          <div className="font-semibold">{(data.metrics.accuracy * 100).toFixed(1)}%</div>
        </div>
      </div>
    </ChartCard>
  );
}
