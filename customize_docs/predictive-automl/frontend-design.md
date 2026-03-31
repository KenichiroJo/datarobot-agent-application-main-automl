# Predictive AutoML Agent — フロントエンド設計

## メタデータ
- **作成日**: 2026-03-31
- **関連仕様**: spec.md, api-spec.md
- **バージョン**: 1.0.0

---

## 1. 設計方針

- **完全リビルド**: 既存チャットUIを置き換える新しいダッシュボードUI
- **再利用**: ChatProvider, useAgUiChat, Zustand store, Radix UI Components は内部で再利用
- **デザイン**: モダンダッシュボード。グラスモーフィズム、金融ブルー系パレット、ダークモード対応
- **チャートライブラリ**: Recharts（React向け、Tailwind統合容易）

---

## 2. ルーティング

```typescript
// src/constants/path.ts
export const PATHS = {
  LANDING: '/',
  CONTENT: '/content',
  CONTENT_CHAT: '/content/:chatId',
  INSIGHTS: '/insights',
  INSIGHTS_CHAT: '/insights/:chatId',
  CHAT: '/chat/:chatId',
  CHAT_EMPTY: '/chat',
  OAUTH_CB: '/oauth/callback',
  SETTINGS: { ROOT: '/settings' },
};
```

| パス | ページ | 説明 |
|------|--------|------|
| `/` | Landing | モード選択（Content / Insights / Chat） |
| `/content` | ContentPage | Predictive Content ダッシュボード |
| `/content/:chatId` | ContentPage | Content + サイドチャット |
| `/insights` | InsightsPage | Model Insights ダッシュボード |
| `/insights/:chatId` | InsightsPage | Insights + サイドチャット |
| `/chat/:chatId` | ChatPage | 汎用チャット（既存） |

---

## 3. レイアウト構造

### AppLayout（全ページ共通）
```
┌──────────────────────────────────────────────────┐
│ AppLayout                                        │
│ ┌──────┬───────────────────────────┬───────────┐ │
│ │ Nav  │ Main Content (Outlet)     │ Chat      │ │
│ │ Side │                           │ Panel     │ │
│ │ bar  │                           │ (optional)│ │
│ │      │                           │           │ │
│ │ 64px │          flex-1           │  380px    │ │
│ └──────┴───────────────────────────┴───────────┘ │
└──────────────────────────────────────────────────┘
```

### NavigationSidebar（左ナビ 64px）
```
┌──────┐
│ Logo │
│      │
│ 📊   │ → /content  (Predictive Content)
│      │
│ 🔍   │ → /insights (Model Insights)
│      │
│ 💬   │ → /chat     (Chat)
│      │
│      │
│ ⚙️   │ → /settings
│ 🌙   │ → darkmode toggle
└──────┘
```

---

## 4. コンポーネントツリー

### 4.1 全体構成

```
App
├── ThemeProvider
├── QueryClientProvider
├── Router
│   ├── AppLayout
│   │   ├── NavigationSidebar
│   │   └── Outlet
│   │       ├── LandingPage
│   │       ├── ContentPage
│   │       │   ├── ContentDashboard
│   │       │   │   ├── CustomerSelector
│   │       │   │   ├── PredictionCard
│   │       │   │   ├── FeatureExplanations
│   │       │   │   ├── NgramHighlight
│   │       │   │   └── GeneratedContentTabs
│   │       │   └── SideChat (optional)
│   │       ├── InsightsPage
│   │       │   ├── InsightsDashboard
│   │       │   │   ├── ModelSummaryCards
│   │       │   │   ├── FeatureImpactChart
│   │       │   │   ├── ROCCurveChart
│   │       │   │   ├── LiftChartComponent
│   │       │   │   ├── ConfusionMatrixGrid
│   │       │   │   ├── FeatureEffectsChart
│   │       │   │   ├── PartialDependencePlot
│   │       │   │   └── WordCloudDisplay
│   │       │   └── SideChat (optional)
│   │       ├── ChatPage (既存再利用)
│   │       └── SettingsLayout
│   └── OAuthCallback
```

### 4.2 共通コンポーネント（src/components/shared/）

| コンポーネント | 説明 | Props |
|--------------|------|-------|
| `ChartCard` | チャートラッパー（タイトル + ローディング + エラー） | title, loading, error, children |
| `KPICard` | 数値KPIカード（値 + ラベル + トレンドアイコン） | label, value, format, trend |
| `GaugeChart` | 確率表示用円形ゲージ | value, max, color, label |
| `SideChat` | 右側チャットパネル（ChatProvider再利用） | chatId, onClose, context |
| `EmptyState` | データなし表示 | icon, title, description |

### 4.3 Content コンポーネント（src/components/content/）

| コンポーネント | 説明 | Props |
|--------------|------|-------|
| `CustomerSelector` | 顧客検索Combobox | datasetId, onSelect, selected |
| `PredictionCard` | 予測確率ゲージ + リスクバッジ | prediction, threshold |
| `FeatureExplanations` | 特徴量説明横棒グラフ | explanations, maxItems |
| `NgramHighlight` | テキストngram色付きハイライト | text, ngramExplanations |
| `GeneratedContentTabs` | 4タブ切り替え（承認/却下/説明/審査） | onGenerate, content |
| `FeedbackPanel` | 👍👎ボタン + メトリクス | onFeedback, metrics |
| `ContentToolbar` | アクションバー（生成ボタン、設定） | onGenerate, settings |

### 4.4 Insights コンポーネント（src/components/insights/）

| コンポーネント | 説明 | Props |
|--------------|------|-------|
| `ModelSummaryCards` | KPIカード群（AUC, F1, LogLoss, Acc） | metrics |
| `FeatureImpactChart` | 横棒グラフ（Recharts BarChart） | features |
| `ROCCurveChart` | ROC曲線折れ線（Recharts LineChart） | rocPoints, auc |
| `LiftChartComponent` | リフトチャート折れ線 | bins |
| `ConfusionMatrixGrid` | 2×2ヒートマップ + 閾値スライダー | matrix, threshold, onChange |
| `FeatureEffectsChart` | 効果チャート + 特徴量セレクター | featureName, data, features |
| `PartialDependencePlot` | PDP折れ線 + 特徴量セレクター | featureName, data, features |
| `WordCloudDisplay` | ワードクラウドSVG | words |
| `DeploymentSelector` | デプロイメント切り替え | deploymentId, onChange |

---

## 5. 状態管理

### 5.1 グローバル状態（Zustand）

既存の `use-chats-state.ts` をそのまま使用（チャット状態管理）。

追加ストアは作成しない — React Queryのキャッシュで十分。

### 5.2 サーバー状態（React Query）

```typescript
// src/api/insights/keys.ts
export const insightsKeys = {
  all: ['insights'] as const,
  deployment: (id: string) => [...insightsKeys.all, id] as const,
  featureImpact: (id: string) => [...insightsKeys.deployment(id), 'feature-impact'] as const,
  roc: (id: string, source: string) => [...insightsKeys.deployment(id), 'roc', source] as const,
  lift: (id: string, source: string) => [...insightsKeys.deployment(id), 'lift', source] as const,
  confusionMatrix: (id: string, threshold: number) => [...insightsKeys.deployment(id), 'confusion-matrix', threshold] as const,
  accuracy: (id: string) => [...insightsKeys.deployment(id), 'accuracy'] as const,
  featureEffects: (id: string, feature: string) => [...insightsKeys.deployment(id), 'feature-effects', feature] as const,
  partialDependence: (id: string, feature: string) => [...insightsKeys.deployment(id), 'partial-dependence', feature] as const,
  wordCloud: (id: string) => [...insightsKeys.deployment(id), 'word-cloud'] as const,
};

// src/api/predictions/keys.ts
export const predictionsKeys = {
  all: ['predictions'] as const,
};

// src/api/datasets/keys.ts
export const datasetsKeys = {
  all: ['datasets'] as const,
  records: (id: string, offset: number, limit: number) => [...datasetsKeys.all, id, 'records', offset, limit] as const,
  schema: (id: string) => [...datasetsKeys.all, id, 'schema'] as const,
};
```

### 5.3 ローカル状態

| ページ | 状態 | 管理方法 |
|--------|------|---------|
| ContentPage | selectedCustomer, activeTab | useState |
| InsightsPage | selectedFeature, threshold | useState |
| Both | chatPanelOpen | useState |

---

## 6. APIクライアント層

### ディレクトリ構成

```
src/api/
├── apiClient.ts          # 既存Axiosクライアント
├── chat/                 # 既存チャットAPI
├── insights/
│   ├── requests.ts       # Axios呼び出し
│   ├── hooks.ts          # React Query hooks
│   ├── types.ts          # TypeScript型
│   └── keys.ts           # Query Key factory
├── predictions/
│   ├── requests.ts
│   ├── hooks.ts
│   ├── types.ts
│   └── keys.ts
└── datasets/
    ├── requests.ts
    ├── hooks.ts
    ├── types.ts
    └── keys.ts
```

### 主要フック

```typescript
// insights/hooks.ts
export function useDeploymentInfo(deploymentId: string) { ... }
export function useFeatureImpact(deploymentId: string) { ... }
export function useROCCurve(deploymentId: string, source?: string) { ... }
export function useLiftChart(deploymentId: string, source?: string) { ... }
export function useConfusionMatrix(deploymentId: string, threshold?: number) { ... }
export function useAccuracy(deploymentId: string) { ... }
export function useFeatureEffects(deploymentId: string, featureName: string) { ... }
export function usePartialDependence(deploymentId: string, featureName: string) { ... }
export function useWordCloud(deploymentId: string) { ... }

// predictions/hooks.ts
export function usePrediction() { return useMutation(...) }

// datasets/hooks.ts
export function useDatasetRecords(datasetId: string, offset: number, limit: number) { ... }
export function useDatasetSchema(datasetId: string) { ... }
```

---

## 7. デザインシステム

### カラーパレット

```css
/* 金融ブルー系 + モダンアクセント */
--color-primary: #2563eb;        /* Blue 600 */
--color-primary-light: #3b82f6;  /* Blue 500 */
--color-primary-dark: #1d4ed8;   /* Blue 700 */

--color-success: #10b981;        /* Emerald 500 — 承認/低リスク */
--color-danger: #ef4444;         /* Red 500 — 却下/高リスク */
--color-warning: #f59e0b;        /* Amber 500 — 中リスク */

/* ダッシュボード背景 */
--color-bg-dark: #0f172a;        /* Slate 900 */
--color-bg-card-dark: #1e293b;   /* Slate 800 */
--color-bg-light: #f8fafc;       /* Slate 50 */
--color-bg-card-light: #ffffff;  /* White */
```

### チャートカラー

```typescript
const CHART_COLORS = {
  primary: '#3b82f6',    // メイン系列
  secondary: '#8b5cf6',  // サブ系列
  positive: '#10b981',   // 正の影響
  negative: '#ef4444',   // 負の影響
  neutral: '#94a3b8',    // 中立
  reference: '#475569',  // 参考線
};
```

### コンポーネントスタイル

- **カード**: `rounded-xl border border-border/50 bg-card backdrop-blur-sm shadow-sm`
- **KPIカード**: `p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5`
- **チャートカード**: `p-4 rounded-xl border border-border/50 h-[300px]`
- **ナビゲーション**: `w-16 bg-sidebar border-r border-border flex flex-col items-center py-4 gap-4`

---

## 8. 新規パッケージ

```json
{
  "dependencies": {
    "recharts": "^2.15.0"
  }
}
```

Rechartsのみ追加。ワードクラウドは自前SVGコンポーネントで実装（外部依存追加を避ける）。

---

## 9. 画面ワイヤーフレーム

### Landing Page
```
┌──────────────────────────────────────────┐
│              Predictive AutoML           │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │📊         │  │🔍         │  │💬       │ │
│  │Predictive │  │Model     │  │Chat    │ │
│  │Content   │  │Insights  │  │        │ │
│  │          │  │          │  │        │ │
│  │ 予測結果  │  │ モデル全体 │  │ 自由に  │ │
│  │ + レター  │  │ の深堀り  │  │ 質問    │ │
│  └──────────┘  └──────────┘  └────────┘ │
└──────────────────────────────────────────┘
```

### Content Page（詳細は spec.md 参照）
### Insights Page（詳細は spec.md 参照）
