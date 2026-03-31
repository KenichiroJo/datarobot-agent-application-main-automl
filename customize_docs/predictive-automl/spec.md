# Predictive AutoML Agent — Credit Risk Edition 仕様書

## メタデータ
- **作成日**: 2026-03-31
- **最終更新**: 2026-03-31
- **バージョン**: 1.0.0
- **著者**: AI Agent
- **ステータス**: Draft

---

## 1. 概要

### 1.1 目的
DataRobotの二値分類モデル（貸倒予測）を活用し、対話型AIエージェントを通じて**予測コンテンツ生成**と**モデルインサイト深堀り**を行うアプリケーション。

### 1.2 スコープ

**含まれるもの**

| レイヤー | 内容 |
|---------|------|
| **Frontend** | 2つのダッシュボード画面（Predictive Content / Model Insights）＋サイドチャット。完全リビルド |
| **Backend API** | DataRobotモデルインサイト取得API、予測実行API、データセット取得API |
| **Agent** | LangGraphベースの4ノードワークフロー（router/analyst/predictor/writer）|
| **MCP Server** | DataRobot SDK連携ツール群（予測、インサイト、メトリクス）|
| **Infrastructure** | ランタイムパラメータ追加（デプロイメントID等）|

**含まれないもの**
- DataRobotモデルの訓練・AutoPilot実行（外部で事前構築済み前提）
- LLMデプロイメントの作成（LLM Gateway使用）
- ユーザー管理・認証の変更（既存のDataRobot認証をそのまま使用）
- データセットのアップロード・管理機能

### 1.3 影響範囲
- [x] Frontend（React）— 完全リビルド
- [x] Backend API（FastAPI）— 新規エンドポイント追加
- [x] Agent（LangGraph）— ワークフロー再設計
- [x] MCP Server — 新規ツール追加
- [ ] Database — 変更なし（既存チャット永続化をそのまま使用）
- [x] 外部サービス連携 — DataRobot API（予測・インサイト）

---

## 2. 背景と目的

### 2.1 現状の課題
1. **predictive-content-generator-main** はStreamlitベースで、対話型のモデル深堀りができない
2. モデル全体のインサイト（Feature Impact, ROC, Lift等）を視覚的に探索するUIがない
3. 予測結果の「なぜ？」を自然言語で質問・深堀りできない
4. 生成コンテンツ（承認/却下レター等）のインタラクティブな調整ができない
5. 本番では異なるモデル・データセットでも利用したいが、現状はハードコード的

### 2.2 期待される効果
1. **対話型モデル解析**: チャットで「なぜこの特徴量が重要？」「この顧客のリスク要因は？」と質問可能
2. **ビジュアルダッシュボード**: Feature Impact, ROC, Lift等をインタラクティブなチャートで表示
3. **コンテンツ自動生成**: 予測結果に基づく承認/却下レター、顧客向け説明、社内審査コメントを自動生成
4. **汎用性**: デプロイメントIDを変えるだけで異なるモデル・ドメインに対応可能
5. **DataRobot統合**: Codespaceでの開発 → `dr deploy` でワンコマンドデプロイ

### 2.3 ステークホルダー

| 役割 | 関心事 |
|------|--------|
| **審査担当者** | 個別顧客の予測結果を確認し、承認/却下レターを素早く生成したい |
| **リスクマネージャー** | モデル全体の予測性能とリスク要因を把握したい |
| **データサイエンティスト** | Feature Impact, PDP, ROC等でモデルの振る舞いを深堀りしたい |
| **ビジネスリーダー** | モデルの信頼性・精度を非技術的に理解したい |

---

## 3. 機能要件

### 3.1 Frontend機能

#### FR-F001: ナビゲーションサイドバー
- **説明**: 左側に常時表示されるナビゲーション。Content / Insights / Chat の3モードを切り替え
- **優先度**: Must
- **ユーザー操作**: アイコンクリックで画面遷移
- **画面遷移**: `/content`, `/insights`, `/chat/:chatId`

#### FR-F002: Predictive Content ダッシュボード
- **説明**: 顧客選択 → 予測結果表示 → コンテンツ生成の一連フローを1画面で提供
- **優先度**: Must
- **ユーザー操作**: 顧客を選択 → 予測カード表示 → 特徴量説明 → コンテンツ生成
- **画面遷移**: `/content`, `/content/:chatId`

#### FR-F003: 顧客セレクター
- **説明**: データセットから顧客を検索・選択するCombobox UI。レコード識別子でフィルタ可能
- **優先度**: Must
- **ユーザー操作**: テキスト入力でフィルタ → ドロップダウンから選択
- **備考**: データセットIDは環境変数/ランタイムパラメータで指定

#### FR-F004: 予測結果カード
- **説明**: 選択された顧客の予測確率を円形ゲージで表示。リスクレベル（高/中/低）をバッジで色分け
- **優先度**: Must
- **ユーザー操作**: 顧客選択後に自動表示
- **備考**: 確率閾値はモデルのF1最適閾値を使用

#### FR-F005: 特徴量説明パネル
- **説明**: 予測に寄与した上位特徴量を横棒グラフで表示。各特徴量の値と影響（正/負）を色分け
- **優先度**: Must
- **ユーザー操作**: 予測結果表示と同時に自動表示。特徴量をクリックで詳細展開
- **備考**: Prediction Explanations APIから取得。最大10特徴量

#### FR-F006: Ngramハイライト表示
- **説明**: テキスト特徴量がある場合、重要なn-gramを色分きハイライト（赤=正の影響、青=負の影響）
- **優先度**: Should
- **ユーザー操作**: テキスト特徴量存在時に自動表示
- **備考**: predictive-content-generatorのcolor_texts()パターンを移植

#### FR-F007: 生成コンテンツタブ
- **説明**: 4つのタブ（承認レター / 却下レター / 顧客向け説明 / 社内審査コメント）で生成コンテンツを表示
- **優先度**: Must
- **ユーザー操作**: タブ切り替えで表示変更。「生成」ボタンで各コンテンツをエージェント経由で生成
- **備考**: LLM Gatewayでエージェントが生成

#### FR-F008: フィードバックボタン
- **説明**: 生成コンテンツに対する👍👎ボタン。フィードバックをDataRobotカスタムメトリクスに送信
- **優先度**: Should
- **ユーザー操作**: ボタンクリック
- **備考**: 将来的なモデル改善に活用

#### FR-F009: Model Insights ダッシュボード
- **説明**: モデル全体の性能・特徴量をインタラクティブなチャートで可視化するダッシュボード
- **優先度**: Must
- **ユーザー操作**: `/insights` でアクセス。各チャートはインタラクティブ（ホバーでツールチップ等）
- **画面遷移**: `/insights`, `/insights/:chatId`

#### FR-F010: モデル精度サマリーカード
- **説明**: KPIカード群（AUC, F1 Score, LogLoss, Accuracy）をダッシュボード上部に表示
- **優先度**: Must
- **ユーザー操作**: 表示のみ（自動取得）

#### FR-F011: Feature Impact チャート
- **説明**: モデル全体の特徴量重要度を横棒グラフで表示（Recharts）
- **優先度**: Must
- **ユーザー操作**: ホバーでツールチップ。チャート内をクリックでサイドチャットにコンテキスト送信可能

#### FR-F012: ROC Curve チャート
- **説明**: ROC曲線を折れ線グラフで表示。AUC値をラベル表示
- **優先度**: Must
- **ユーザー操作**: ホバーで閾値ごとのTPR/FPR表示

#### FR-F013: Lift Chart
- **説明**: リフトチャートを折れ線グラフで表示
- **優先度**: Must
- **ユーザー操作**: ホバーでビン詳細表示

#### FR-F014: Confusion Matrix
- **説明**: 2×2の混同行列をヒートマップ形式で表示。TP/FP/TN/FN の件数と割合
- **優先度**: Must
- **ユーザー操作**: 閾値スライダーでリアルタイム更新

#### FR-F015: Feature Effects チャート
- **説明**: 選択した特徴量の効果を折れ線グラフで表示
- **優先度**: Should
- **ユーザー操作**: 特徴量ドロップダウンで選択 → グラフ更新

#### FR-F016: Partial Dependence Plot
- **説明**: 選択した特徴量のPartial Dependenceを折れ線グラフで表示
- **優先度**: Should
- **ユーザー操作**: 特徴量ドロップダウンで選択 → グラフ更新

#### FR-F017: Word Cloud 表示
- **説明**: テキスト特徴量の重要語をワードクラウドで視覚化
- **優先度**: Could
- **ユーザー操作**: テキスト特徴量存在時に自動表示
- **備考**: ngram explanationデータから構築

#### FR-F018: サイドチャットパネル
- **説明**: ContentページとInsightsページの右側にチャットパネルを配置。エージェントと対話でインサイト深堀り・コンテンツ生成依頼が可能
- **優先度**: Must
- **ユーザー操作**: テキスト入力 → エージェント応答（SSEストリーミング）
- **備考**: 既存の ChatProvider / useAgUiChat を再利用。画面コンテキスト（現在表示中のインサイト等）をメッセージに自動付与

#### FR-F019: ダークモード対応
- **説明**: ダッシュボード全体がダークモード/ライトモード切り替え対応
- **優先度**: Should
- **ユーザー操作**: トグルスイッチ
- **備考**: 既存ThemeProvider活用

#### FR-F020: レスポンシブデザイン
- **説明**: デスクトップ（1440px+）とタブレット（768px+）で最適表示
- **優先度**: Should
- **ユーザー操作**: 自動レイアウト調整

---

### 3.2 Backend API機能

#### FR-A001: デプロイメント情報取得
- **説明**: DataRobotデプロイメントのメタデータ（ターゲット、モデルタイプ、プロジェクトID等）を取得
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}`
- **入力**: deployment_id（パスパラメータ）
- **出力**: DeploymentInfoResponse（target, model_type, project_id, model_id, created_at）

#### FR-A002: Feature Impact 取得
- **説明**: モデルの特徴量重要度データを返却
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/feature-impact`
- **入力**: deployment_id
- **出力**: FeatureImpactResponse（features: [{name, impact, relative_impact}]）
- **備考**: DataRobot SDK `model.get_or_request_feature_impact()` 使用。結果をTTLキャッシュ

#### FR-A003: ROC Curve 取得
- **説明**: ROC曲線データ（各閾値でのTPR/FPR）を返却
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/roc`
- **入力**: deployment_id, source（query: validation/crossValidation/holdout）
- **出力**: ROCCurveResponse（auc, points: [{threshold, tpr, fpr}]）

#### FR-A004: Lift Chart 取得
- **説明**: リフトチャートデータを返却
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/lift`
- **入力**: deployment_id, source
- **出力**: LiftChartResponse（bins: [{actual, predicted, bin_weight}]）

#### FR-A005: Confusion Matrix 取得
- **説明**: 指定閾値での混同行列データを返却
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/confusion-matrix`
- **入力**: deployment_id, threshold（query, default=0.5）
- **出力**: ConfusionMatrixResponse（tp, fp, tn, fn, threshold, accuracy, precision, recall, f1）

#### FR-A006: モデル精度サマリー取得
- **説明**: 主要精度メトリクス一覧を返却
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/accuracy`
- **入力**: deployment_id
- **出力**: AccuracyResponse（metrics: [{name, value, source}]）— AUC, F1, LogLoss, Accuracy等

#### FR-A007: Feature Effects 取得
- **説明**: 指定特徴量の効果データを返却
- **優先度**: Should
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/feature-effects/{feature_name}`
- **入力**: deployment_id, feature_name
- **出力**: FeatureEffectsResponse（feature_name, partial_dependence: [{value, dependence}], type）

#### FR-A008: Partial Dependence Plot 取得
- **説明**: 指定特徴量のPartial Dependenceデータを返却
- **優先度**: Should
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/partial-dependence/{feature_name}`
- **入力**: deployment_id, feature_name
- **出力**: PartialDependenceResponse（feature_name, data: [{value, mean_prediction}]）

#### FR-A009: 予測実行
- **説明**: 顧客データを受け取り、DataRobot予測デプロイメントで予測実行。確率と特徴量説明を返却
- **優先度**: Must
- **エンドポイント**: `POST /api/v1/predictions`
- **入力**: PredictionRequest（deployment_id, data: dict, max_explanations: int）
- **出力**: PredictionResponse（prediction, probability, explanations: [ExplanationItem], ngram_explanations）
- **備考**: datarobot-predict ライブラリ使用

#### FR-A010: データセットレコード取得
- **説明**: DataRobotデータセットからレコードを取得（顧客一覧表示用）
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/datasets/{dataset_id}/records`
- **入力**: dataset_id, offset, limit, search（query parameters）
- **出力**: DatasetRecordsResponse（records: [dict], total, columns: [str]）

#### FR-A011: データセットスキーマ取得
- **説明**: データセットのカラム情報を返却
- **優先度**: Must
- **エンドポイント**: `GET /api/v1/datasets/{dataset_id}/schema`
- **入力**: dataset_id
- **出力**: DatasetSchemaResponse（columns: [{name, type, min, max, unique_count}]）

#### FR-A012: Word Cloud データ取得
- **説明**: テキスト特徴量の重要語データを返却
- **優先度**: Could
- **エンドポイント**: `GET /api/v1/insights/{deployment_id}/word-cloud`
- **入力**: deployment_id
- **出力**: WordCloudResponse（words: [{text, weight, sentiment}]）

---

### 3.3 Agent機能

#### FR-G001: ユーザー意図ルーティング
- **説明**: ユーザーのメッセージを分析し、適切なノード（analyst/predictor/writer）にルーティング
- **優先度**: Must
- **トリガー**: 全てのユーザーメッセージ
- **入力**: ユーザーメッセージ + チャット履歴
- **出力**: ルーティング先ノードの決定
- **LLM利用**: LLM Gateway経由でGPTモデル

#### FR-G002: モデル全体インサイト分析
- **説明**: DataRobotモデルの全体的なインサイト（Feature Impact, ROC, Lift等）を取得し、自然言語で解説
- **優先度**: Must
- **トリガー**: 「モデルの精度は？」「特徴量の重要度を教えて」「ROCを見せて」等の質問
- **入力**: ユーザーの分析リクエスト + デプロイメントID
- **出力**: インサイトデータ（JSON） + 自然言語解説
- **LLM利用**: インサイトデータの解釈・要約

#### FR-G003: 個別顧客予測と説明
- **説明**: 指定された顧客データで予測を実行し、予測理由を特徴量説明と共に自然言語で解説
- **優先度**: Must
- **トリガー**: 「顧客Aの貸倒リスクは？」「この申し込みを評価して」等
- **入力**: 顧客ID or 顧客データ + デプロイメントID
- **出力**: 予測確率 + 特徴量説明 + 自然言語解説
- **LLM利用**: 予測結果の解釈・平易な説明

#### FR-G004: 承認/却下レター生成
- **説明**: 予測結果と特徴量説明に基づき、審査結果レターを生成
- **優先度**: Must
- **トリガー**: 「承認レターを作成して」「却下理由を書いて」等
- **入力**: 予測結果 + 特徴量説明 + トーン設定
- **出力**: フォーマット済みレター文書
- **LLM利用**: レター文面の生成

#### FR-G005: 顧客向け説明文書生成
- **説明**: 予測結果を顧客にわかりやすく説明する文書を生成
- **優先度**: Must
- **トリガー**: 「顧客への説明文を作って」等
- **入力**: 予測結果 + 特徴量説明
- **出力**: 平易な説明文書
- **LLM利用**: 専門用語を避けた平易な表現での生成

#### FR-G006: 社内審査コメント生成
- **説明**: 社内審査担当者向けの技術的なコメント・レポートを生成
- **優先度**: Must
- **トリガー**: 「審査コメントを作成して」等
- **入力**: 予測結果 + 特徴量説明 + モデルインサイト
- **出力**: 専門的な審査コメント
- **LLM利用**: 技術的・統計的な表現での生成

#### FR-G007: MCP予測ツール
- **説明**: DataRobot予測デプロイメントを呼び出すMCPツール
- **優先度**: Must
- **トリガー**: エージェントが予測を必要とする時
- **入力**: deployment_id, customer_data（dict）, max_explanations
- **出力**: 予測確率、特徴量説明リスト、ngram説明

#### FR-G008: MCPインサイトツール群
- **説明**: DataRobot Model APIからインサイトデータを取得するMCPツール群
- **優先度**: Must
- **トリガー**: エージェントがモデル分析を行う時
- **入力**: project_id, model_id（+ feature_name for effects/PDP）
- **出力**: 各インサイトの構造化データ（JSON）
- **備考**: get_feature_impact, get_roc_curve, get_lift_chart, get_confusion_matrix, get_model_accuracy, get_feature_effects, get_partial_dependence, get_word_cloud

#### FR-G009: MCPデータセットツール
- **説明**: DataRobotデータセットからレコードを取得するMCPツール
- **優先度**: Must
- **トリガー**: エージェントが顧客データを参照する時
- **入力**: dataset_id, filters（optional）
- **出力**: レコードリスト

#### FR-G010: フィードバック送信ツール
- **説明**: ユーザーフィードバックをDataRobotカスタムメトリクスに送信するMCPツール
- **優先度**: Should
- **トリガー**: ユーザーが生成コンテンツに👍👎を押した時
- **入力**: deployment_id, association_id, feedback_value
- **出力**: 送信成功/失敗

---

## 4. 非機能要件

### 4.1 パフォーマンス

| レイヤー | 指標 | 目標値 |
|---------|------|--------|
| Frontend | チャート初期描画 | < 2秒 |
| Frontend | ページ遷移 | < 500ms |
| Backend API | インサイト取得（キャッシュヒット時） | < 200ms |
| Backend API | インサイト取得（キャッシュミス時） | < 5秒 |
| Backend API | 予測実行 | < 3秒 |
| Agent | 分析応答（ストリーミング開始） | < 3秒 |
| Agent | コンテンツ生成完了 | < 15秒 |

### 4.2 可用性
- DataRobot Platformに依存（SLA準拠）
- Agent障害時: チャットにエラーメッセージ表示、ダッシュボードはBackend APIから直接データ取得で表示可能

### 4.3 セキュリティ
- 認証: DataRobot認証（既存の `DataRobotASGIMiddleware` そのまま使用）
- 認可: DataRobot Platform のロールベースアクセス制御
- データ保護: DataRobot API通信はHTTPS。ローカルDB（SQLite）は既存セッション管理のみ

### 4.4 スケーラビリティ
- 想定ユーザー数: 初期10名（デモ） → 本番50-100名
- Agent並行実行数: DataRobot deployment のcompute機で制御（max_computes=2-4）
- インサイトキャッシュ: Backend TTLキャッシュ（300秒）+ Frontend React Query staleTime（60秒）

---

## 5. 制約条件

### 5.1 技術的制約

#### Frontend
- React 19, TypeScript, Vite 7
- UIライブラリ: Radix UI + Tailwind CSS 4
- チャートライブラリ: Recharts（新規追加）
- 状態管理: Zustand + React Query（TanStack）
- エージェント通信: @ag-ui/client（既存）

#### Backend API
- Python 3.11+, FastAPI
- ORM: SQLModel + SQLAlchemy 2.0 async
- DataRobot SDK: `datarobot`, `datarobot-predict`
- データベース: SQLite（既存変更なし）

#### Agent
- LangGraph（datarobot-genai ライブラリ）
- `MyAgent(LangGraphAgent)` — クラス名変更禁止
- `llm()` メソッド変更禁止
- エージェントコードは `agent/agent/` 内のみ
- LLM: DataRobot LLM Gateway 経由

#### MCP Server
- FastMCP, `@dr_mcp_tool` デコレータ
- ツールは `mcp_server/app/tools/` に配置

#### Infrastructure
- Pulumi IaC（既存構成を拡張）
- DataRobot Codespaceで開発
- `dr deploy` / `dr task run infra:up-yes` でデプロイ
- ランタイムパラメータで設定注入

### 5.2 外部サービス依存

| サービス | 用途 | 制限 |
|---------|------|------|
| DataRobot Prediction API | 予測実行 | デプロイメント必要 |
| DataRobot Model API | インサイト取得 | プロジェクト/モデルIDが必要 |
| DataRobot Dataset API | データ取得 | データセットID必要 |
| DataRobot LLM Gateway | コンテンツ生成 | LLMモデルのアクセス権限必要 |
| DataRobot Custom Metrics | フィードバック | メトリクスの事前登録が必要 |

### 5.3 既存システムとの整合性
- 既存API互換性: 既存の `/api/v1/chat` エンドポイントはそのまま維持。新規エンドポイントを追加
- 既存Frontend: 完全リビルドだが、ChatProvider / useAgUiChat / Zustand store 等の既存コンポーネントは内部で再利用
- 既存Agent: myagent.py のワークフローを再設計するが、MyAgentクラス・llm()メソッドは維持

---

## 6. 受入基準

### 6.1 機能テスト

| ID | レイヤー | テスト項目 | 期待結果 |
|----|---------|-----------|---------|
| AC-F001 | Frontend | `/content` にアクセス | Contentダッシュボードが表示される |
| AC-F002 | Frontend | 顧客を選択 | 予測カードに確率ゲージが表示される |
| AC-F003 | Frontend | 「生成」ボタン押下 | サイドチャット経由でレターが生成・表示される |
| AC-F004 | Frontend | `/insights` にアクセス | KPIカード + 全チャートが表示される |
| AC-F005 | Frontend | Feature Impactチャートにホバー | ツールチップで詳細が表示される |
| AC-F006 | Frontend | サイドチャットで質問入力 | エージェントがストリーミング応答する |
| AC-F007 | Frontend | ダーク/ライトモード切り替え | 全UIが正しく切り替わる |
| AC-A001 | Backend | `GET /api/v1/insights/{id}/feature-impact` | Feature Impactデータが返却される |
| AC-A002 | Backend | `GET /api/v1/insights/{id}/roc` | ROCデータが返却される |
| AC-A003 | Backend | `POST /api/v1/predictions` (正常データ) | 予測確率と特徴量説明が返却される |
| AC-A004 | Backend | `GET /api/v1/datasets/{id}/records` | レコード一覧が返却される |
| AC-A005 | Backend | 2回目のインサイト取得 | キャッシュヒットで高速に返却される |
| AC-G001 | Agent | 「モデルの精度を教えて」 | AUC, F1等のメトリクスを自然言語で説明 |
| AC-G002 | Agent | 「顧客Aの貸倒リスクは？」 | 予測確率と主要な説明を返答 |
| AC-G003 | Agent | 「承認レターを作成して」 | 予測結果に基づくレターが生成される |
| AC-G004 | Agent | 「なぜ年収が最も重要？」 | Feature ImpactデータとPDPを参照し解説 |

### 6.2 統合テスト

| ID | テスト項目 | 期待結果 |
|----|-----------|---------|
| AC-I001 | Content画面で顧客選択→予測→レター生成の全フロー | 一貫して動作し、結果が表示される |
| AC-I002 | Insights画面で全チャート表示→チャットで深堀り | チャートデータとチャット応答が整合する |
| AC-I003 | `dr run dev` でローカル起動 | 全サービス（8080, 5173, 8842）が正常起動する |
| AC-I004 | `dr task run infra:up-yes` でデプロイ | DataRobot上でアプリケーションが正常動作する |

### 6.3 リリース基準
- [ ] 全ての受入テストがPass
- [ ] `dr task run agent:lint` がPass
- [ ] `dr task run agent:test` がPass
- [ ] Frontend ビルドエラーなし
- [ ] E2Eテスト（Playwright）がPass
- [ ] ドキュメント更新完了（README.md）

---

## 7. 用語集

| 用語 | 定義 |
|------|------|
| **二値分類モデル** | 2つのクラス（貸倒/非貸倒）のいずれかを予測するモデル |
| **Feature Impact** | モデル全体で各特徴量がどの程度予測に寄与しているかの指標 |
| **Feature Effects** | 特定の特徴量の値が変化した時に予測がどう変わるかの指標 |
| **Prediction Explanations** | 個別予測に対して、各特徴量がどの方向にどれだけ影響したかの説明 |
| **Partial Dependence** | 他の特徴量を平均化した上で、特定の特徴量と予測値の関係を示すプロット |
| **ROC Curve** | 閾値を変化させた時のTrue Positive RateとFalse Positive Rateの関係 |
| **Lift Chart** | モデルの予測確率順にソートしたときの実際の正例率の累積分布 |
| **Confusion Matrix** | 予測結果と実際の結果の組み合わせ（TP/FP/TN/FN）を表にしたもの |
| **LLM Gateway** | DataRobotが提供するLLMアクセス基盤。個別のLLMデプロイメントなしでLLMを利用可能 |
| **MCP** | Model Context Protocol。エージェントが外部ツールを呼び出すための標準プロトコル |
| **Ngram** | テキスト中の連続するN個の単語/文字の組み合わせ |

---

## 8. 参考資料

| 資料 | 場所 | 用途 |
|------|------|------|
| predictive-content-generator-main | ワークスペース内 | NBOロジック移植元 |
| datarobot-agent-application-main/AGENTS.md | 同上 | Agent開発制約 |
| DataRobot Python SDK Docs | https://docs.datarobot.com/en/docs/api/api-quickstart/index.html | SDK API参照 |
| 与信リスクのデータ_train.xlsx | ワークスペースルート | デモデータ |

---

## 更新履歴

| 日付 | バージョン | 変更内容 | 著者 |
|------|-----------|---------|------|
| 2026-03-31 | 1.0.0 | 初版作成 | AI Agent |
