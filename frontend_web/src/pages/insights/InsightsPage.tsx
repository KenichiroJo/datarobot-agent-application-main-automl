import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ModelSummaryCards } from '@/components/insights/ModelSummaryCards';
import { FeatureImpactChart } from '@/components/insights/FeatureImpactChart';
import { ROCCurveChart } from '@/components/insights/ROCCurveChart';
import { LiftChartComponent } from '@/components/insights/LiftChartComponent';
import { ConfusionMatrixGrid } from '@/components/insights/ConfusionMatrixGrid';
import { FeatureEffectsChart } from '@/components/insights/FeatureEffectsChart';
import { InlineChat } from '@/components/insights/InlineChat';
import { useAppConfig } from '@/api/config/hooks';
import {
  useAccuracy,
  useConfusionMatrix,
  useFeatureEffects,
  useFeatureImpact,
  useLiftChart,
  useROCCurve,
} from '@/api/insights/hooks';

export function InsightsPage() {
  const { data: config } = useAppConfig();
  const deploymentId = config?.deploymentId ?? '';

  const { data: accuracy, isLoading: loadingAccuracy } = useAccuracy(deploymentId);
  const { data: featureImpact, isLoading: loadingFI } = useFeatureImpact(deploymentId);
  const { data: roc, isLoading: loadingROC } = useROCCurve(deploymentId);
  const { data: lift, isLoading: loadingLift } = useLiftChart(deploymentId);

  const [cmThreshold, setCmThreshold] = useState(0.5);
  const { data: confusion, isLoading: loadingCM, error: cmError } = useConfusionMatrix(deploymentId, cmThreshold);

  const [selectedFeature, setSelectedFeature] = useState('');
  const { data: featureEffects, isLoading: loadingFE } = useFeatureEffects(
    deploymentId,
    selectedFeature,
  );

  const handleFeatureClick = useCallback((featureName: string) => {
    setSelectedFeature(featureName);
  }, []);

  const handleThresholdSelect = useCallback((threshold: number) => {
    setCmThreshold(threshold);
  }, []);

  return (
    <>
      <DashboardLayout
        title="モデルインサイト"
        subtitle="予測モデルの性能分析ダッシュボード"
        action={
          deploymentId ? (
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Deployment: {deploymentId.slice(0, 8)}…
            </span>
          ) : (
            <span className="text-xs text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full">
              PREDICTION_DEPLOYMENT_IDを設定してください
            </span>
          )
        }
      >
        <div className="space-y-6">
          {/* Model Summary - KPIs and Gauges */}
          <ModelSummaryCards data={accuracy} loading={loadingAccuracy} />

          {/* Main Charts - 2x2 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FeatureImpactChart data={featureImpact} loading={loadingFI} />
            <ROCCurveChart
              data={roc}
              loading={loadingROC}
              selectedThreshold={cmThreshold}
              onThresholdSelect={handleThresholdSelect}
            />
            <LiftChartComponent data={lift} loading={loadingLift} />
            <ConfusionMatrixGrid
              data={confusion}
              loading={loadingCM}
              error={cmError instanceof Error ? cmError.message : cmError ? String(cmError) : undefined}
              threshold={cmThreshold}
              onThresholdChange={handleThresholdSelect}
            />
          </div>

          {/* Feature Deep Dive */}
          {featureImpact && featureImpact.features.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Feature Effects — 特徴量を選択して深堀り分析
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {featureImpact.features.slice(0, 10).map((f) => (
                  <button
                    key={f.featureName}
                    onClick={() => handleFeatureClick(f.featureName)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      selectedFeature === f.featureName
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/30'
                    }`}
                  >
                    {f.featureName}
                  </button>
                ))}
              </div>
              {selectedFeature && (
                <FeatureEffectsChart data={featureEffects} loading={loadingFE} />
              )}
            </div>
          )}

          {/* Inline Chat */}
          <InlineChat />
        </div>
      </DashboardLayout>
    </>
  );
}
