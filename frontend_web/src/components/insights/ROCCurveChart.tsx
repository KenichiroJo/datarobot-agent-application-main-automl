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
  selectedThreshold?: number;
  onThresholdSelect?: (threshold: number) => void;
}

export function ROCCurveChart({ data, loading, selectedThreshold, onThresholdSelect }: Props) {
  const points = data?.rocPoints.map((p) => ({
    fpr: p.falsePositiveRate,
    tpr: p.truePositiveRate,
    threshold: p.threshold,
  })) ?? [];

  // Find the point closest to selected threshold
  const selectedPoint = selectedThreshold != null && points.length > 0
    ? points.reduce((best, pt) =>
        Math.abs(pt.threshold - selectedThreshold) < Math.abs(best.threshold - selectedThreshold) ? pt : best
      )
    : null;

  return (
    <ChartCard
      title="ROC Curve"
      subtitle={data ? `AUC = ${data.auc.toFixed(4)}` : 'ROC曲線'}
      loading={loading}
      action={
        selectedThreshold != null ? (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            閾値: {selectedThreshold.toFixed(3)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">クリックで閾値選択</span>
        )
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={points}
          margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
          onClick={(e) => {
            if (e?.activePayload?.[0]?.payload && onThresholdSelect) {
              onThresholdSelect(e.activePayload[0].payload.threshold);
            }
          }}
          style={{ cursor: onThresholdSelect ? 'crosshair' : 'default' }}
        >
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
            formatter={(value: number, name: string) => {
              if (name === 'tpr') return [value.toFixed(4), 'TPR'];
              return [value.toFixed(4)];
            }}
            labelFormatter={(label: number) => `FPR: ${label.toFixed(4)}`}
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const pt = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
                  <div>Threshold: <strong>{pt.threshold.toFixed(4)}</strong></div>
                  <div>FPR: {pt.fpr.toFixed(4)}</div>
                  <div>TPR: {pt.tpr.toFixed(4)}</div>
                </div>
              );
            }}
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
            activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
          />
          {selectedPoint && (
            <ReferenceLine
              x={selectedPoint.fpr}
              stroke="#ef4444"
              strokeDasharray="3 3"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {selectedPoint && (
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>FPR: {selectedPoint.fpr.toFixed(4)}</span>
          <span>TPR: {selectedPoint.tpr.toFixed(4)}</span>
        </div>
      )}
    </ChartCard>
  );
}
