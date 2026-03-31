import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CustomerSelector } from '@/components/content/CustomerSelector';
import { PredictionCard } from '@/components/content/PredictionCard';
import { useAppConfig } from '@/api/config/hooks';
import { useDatasetRecords } from '@/api/datasets/hooks';
import { useCreatePrediction } from '@/api/predictions/hooks';
import { AG_UI_ENDPOINT } from '@/constants/endpoints';
import { FileText, Loader2, X } from 'lucide-react';
import type { PredictionResponse } from '@/api/predictions/types';

export function ContentPage() {
  const { data: config } = useAppConfig();
  const deploymentId = config?.deploymentId ?? '';
  const datasetId = config?.datasetId ?? '';

  const { data: records, isLoading: loadingRecords } = useDatasetRecords(datasetId);
  const predictionMutation = useCreatePrediction();
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  // Inline content generation state
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatingLabel, setGeneratingLabel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSelectCustomer = useCallback(
    async (record: Record<string, any>) => {
      setSelectedRecord(record);
      setSelectedIndex(records?.records.indexOf(record));
      setPrediction(null);
      setGeneratedContent('');
      setGeneratingLabel('');

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

  const handleGenerate = useCallback(
    async (label: string) => {
      if (!prediction || !selectedRecord || isGenerating) return;

      const msg = `${label}してください（予測結果: ${prediction.prediction}, 確率: ${(prediction.predictionProbability * 100).toFixed(1)}%、顧客データ: ${JSON.stringify(selectedRecord)}）`;

      setGeneratingLabel(label);
      setGeneratedContent('');
      setIsGenerating(true);

      abortRef.current = new AbortController();

      const body = {
        threadId: uuid(),
        runId: uuid(),
        state: '',
        messages: [{ id: uuid(), role: 'user', content: msg }],
        tools: [],
        context: [],
        forwardedProps: {},
      };

      try {
        const resp = await fetch(AG_UI_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          credentials: 'include',
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${errText}`);
        }

        const reader = resp.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const chunk of lines) {
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const event = JSON.parse(line.slice(6));
                if (
                  event.type === 'TEXT_MESSAGE_CONTENT' ||
                  event.type === 'TextMessageContent'
                ) {
                  const delta = event.delta ?? event.content ?? '';
                  fullText += delta;
                  setGeneratedContent(fullText);
                }
              } catch {
                // skip unparseable lines
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Content generation error:', err);
        setGeneratedContent(`エラーが発生しました: ${err?.message || 'Unknown error'}`);
      } finally {
        setIsGenerating(false);
        setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    },
    [prediction, selectedRecord, isGenerating],
  );

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
  };

  return (
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
              disabled={isGenerating}
              onClick={() => handleGenerate(label)}
              className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">AIが自動生成します</p>
            </button>
          ))}
        </div>
      )}

      {(generatedContent || isGenerating) && (
        <div ref={contentRef} className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">{generatingLabel}</span>
              {isGenerating && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            </div>
            <button
              onClick={() => {
                handleCancel();
                setGeneratedContent('');
                setGeneratingLabel('');
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-5 max-h-[500px] overflow-y-auto">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {generatedContent || (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  <span>生成中...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
