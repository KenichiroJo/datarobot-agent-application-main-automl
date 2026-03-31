import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CustomerSelector } from '@/components/content/CustomerSelector';
import { PredictionCard } from '@/components/content/PredictionCard';
import { SideChat } from '@/components/shared/SideChat';
import { useAppConfig } from '@/api/config/hooks';
import { useDatasetRecords } from '@/api/datasets/hooks';
import { useCreatePrediction } from '@/api/predictions/hooks';
import type { PredictionResponse } from '@/api/predictions/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function ContentPage() {
  const { data: config } = useAppConfig();
  const deploymentId = config?.deploymentId ?? '';
  const datasetId = config?.datasetId ?? '';

  const { data: records, isLoading: loadingRecords } = useDatasetRecords(datasetId);
  const predictionMutation = useCreatePrediction();
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleSelectCustomer = useCallback(
    async (record: Record<string, any>) => {
      setSelectedRecord(record);
      setSelectedIndex(records?.records.indexOf(record));
      setPrediction(null);

      if (!deploymentId) return;

      try {
        const result = await predictionMutation.mutateAsync({
          deploymentId,
          data: record,
          maxExplanations: 10,
        });
        setPrediction(result);
      } catch (err) {
        console.error('Prediction failed:', err);
      }
    },
    [deploymentId, predictionMutation, records],
  );

  const handleChatSend = useCallback(
    (message: string) => {
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      // In a full implementation, this would connect to the agent API via SSE
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'チャット機能は `/chat` ページでフル機能をご利用いただけます。ここではクイック質問にお答えします。',
          },
        ]);
      }, 500);
    },
    [],
  );

  const chatContext = prediction
    ? `現在選択中の顧客: ${JSON.stringify(selectedRecord)}, 予測結果: ${prediction.prediction} (確率: ${(prediction.predictionProbability * 100).toFixed(1)}%)`
    : undefined;

  return (
    <>
      <DashboardLayout
        title="予測コンテンツ"
        subtitle="顧客のリスク予測と自動コンテンツ生成"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerSelector
            data={records}
            loading={loadingRecords}
            onSelect={handleSelectCustomer}
            selectedIndex={selectedIndex}
          />
          <PredictionCard data={prediction ?? undefined} loading={predictionMutation.isPending} />
        </div>

        {prediction && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {['承認レター作成', '却下レター作成', '社内審査コメント作成'].map((label) => (
              <button
                key={label}
                onClick={() => handleChatSend(`${label}してください（予測結果: ${prediction.prediction}, 確率: ${(prediction.predictionProbability * 100).toFixed(1)}%）`)}
                className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-medium text-foreground">{label}</span>
                <p className="text-xs text-muted-foreground mt-1">AIが自動生成します</p>
              </button>
            ))}
          </div>
        )}
      </DashboardLayout>

      <SideChat
        messages={chatMessages}
        onSend={handleChatSend}
        context={chatContext}
      />
    </>
  );
}
