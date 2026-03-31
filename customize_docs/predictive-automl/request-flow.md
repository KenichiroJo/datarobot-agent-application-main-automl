# Predictive AutoML Agent — リクエストフロー設計

## メタデータ
- **作成日**: 2026-03-31
- **関連仕様**: spec.md, api-spec.md, agent-design.md, frontend-design.md
- **バージョン**: 1.0.0

---

## 1. 全体アーキテクチャ図

```
┌──────────────┐     ┌──────────────────────────────────────────┐
│   Frontend   │     │          FastAPI Server (8080)           │
│  (React)     │     │                                          │
│              │ HTTP│  Router ──► Service ──► DataRobot SDK    │
│  /content    │────►│  (v1/)      (datarobot_client.py)        │
│  /insights   │     │                                          │
│  /chat       │     │  Router ──► AGUIStreamManager ──► Agent  │
│              │◄────│  (chat.py)                               │
│              │ SSE │                                          │
└──────────────┘     └──────────────────────────────────────────┘
                                                    │
                     ┌──────────────────────────────▼───────────┐
                     │        Agent Deployment (8842)            │
                     │  MyAgent (LangGraph ReAct)                │
                     │     │                                     │
                     │     └──► MCP Server ──► DataRobot API     │
                     └───────────────────────────────────────────┘
```

---

## 2. ディレクトリ構成（新規作成・変更ファイル）

```
datarobot-agent-application-main/
│
├── customize_docs/predictive-automl/     # 新規: 要件定義書群
│   ├── spec.md
│   ├── user-stories.md
│   ├── api-spec.md
│   ├── data-model.md
│   ├── agent-design.md
│   ├── frontend-design.md
│   ├── architecture.md
│   └── request-flow.md                  # このファイル
│
├── agent/agent/                          # 変更: エージェント再設計
│   ├── myagent.py                        # 変更: ワークフロー・ノード再設計
│   ├── prompts.py                        # 新規: SYSTEM_PROMPT定義
│   └── workflow.yaml                     # 変更: スキル定義更新
│
├── mcp_server/app/tools/                 # 新規: MCPツール群
│   ├── prediction_tools.py              # 新規: predict_customer, get_dataset_records
│   ├── insights_tools.py                # 新規: get_feature_impact, get_roc_curve, ...
│   └── metrics_tools.py                 # 新規: submit_feedback
│
├── fastapi_server/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── __init__.py              # 変更: 新ルーター登録
│   │   │   ├── insights.py              # 新規: Insightsエンドポイント
│   │   │   ├── predictions.py           # 新規: Predictionsエンドポイント
│   │   │   ├── datasets.py              # 新規: Datasetsエンドポイント
│   │   │   └── schemas/
│   │   │       ├── __init__.py          # 新規
│   │   │       ├── insights.py          # 新規: Insightsスキーマ
│   │   │       ├── predictions.py       # 新規: Predictionsスキーマ
│   │   │       └── datasets.py          # 新規: Datasetsスキーマ
│   │   ├── services/
│   │   │   └── datarobot_client.py      # 新規: DataRobot SDKラッパー
│   │   └── config.py                    # 変更: 新規設定追加
│   └── pyproject.toml                   # 変更: datarobot依存追加
│
├── frontend_web/
│   ├── package.json                     # 変更: recharts追加
│   └── src/
│       ├── constants/path.ts            # 変更: 新パス追加
│       ├── routesConfig.tsx             # 変更: 新ルート追加
│       ├── App.tsx                      # 変更: レイアウト変更
│       ├── pages/
│       │   ├── Landing.tsx              # 新規: ランディングページ
│       │   ├── content/
│       │   │   └── ContentPage.tsx      # 新規
│       │   └── insights/
│       │       └── InsightsPage.tsx      # 新規
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.tsx         # 新規: 新レイアウト
│       │   │   ├── DashboardLayout.tsx   # 新規: ダッシュボード用
│       │   │   └── NavigationSidebar.tsx  # 新規: 左ナビゲーション
│       │   ├── shared/
│       │   │   ├── ChartCard.tsx         # 新規
│       │   │   ├── KPICard.tsx           # 新規
│       │   │   ├── GaugeChart.tsx        # 新規
│       │   │   ├── SideChat.tsx          # 新規
│       │   │   └── EmptyState.tsx        # 新規
│       │   ├── content/
│       │   │   ├── CustomerSelector.tsx  # 新規
│       │   │   ├── PredictionCard.tsx    # 新規
│       │   │   ├── FeatureExplanations.tsx # 新規
│       │   │   ├── NgramHighlight.tsx    # 新規
│       │   │   ├── GeneratedContentTabs.tsx # 新規
│       │   │   ├── FeedbackPanel.tsx     # 新規
│       │   │   └── ContentToolbar.tsx    # 新規
│       │   └── insights/
│       │       ├── ModelSummaryCards.tsx  # 新規
│       │       ├── FeatureImpactChart.tsx # 新規
│       │       ├── ROCCurveChart.tsx     # 新規
│       │       ├── LiftChartComponent.tsx # 新規
│       │       ├── ConfusionMatrixGrid.tsx # 新規
│       │       ├── FeatureEffectsChart.tsx # 新規
│       │       ├── PartialDependencePlot.tsx # 新規
│       │       ├── WordCloudDisplay.tsx  # 新規
│       │       └── DeploymentSelector.tsx # 新規
│       └── api/
│           ├── insights/
│           │   ├── requests.ts          # 新規
│           │   ├── hooks.ts             # 新規
│           │   ├── types.ts             # 新規
│           │   └── keys.ts              # 新規
│           ├── predictions/
│           │   ├── requests.ts          # 新規
│           │   ├── hooks.ts             # 新規
│           │   ├── types.ts             # 新規
│           │   └── keys.ts              # 新規
│           └── datasets/
│               ├── requests.ts          # 新規
│               ├── hooks.ts             # 新規
│               ├── types.ts             # 新規
│               └── keys.ts             # 新規
│
└── infra/infra/
    └── fastapi_server.py                # 変更: ランタイムパラメータ追加
```

---

## 3. 依存の向き

```
Frontend (React)
    │
    ▼ HTTP/SSE
FastAPI Router Layer (insights.py, predictions.py, datasets.py, chat.py)
    │
    ▼ function call
Service Layer (datarobot_client.py, AGUIStreamManager)
    │
    ▼ SDK / HTTP
External (DataRobot API, Agent Deployment)
```

**ルール**:
- Router → Service: OK
- Service → DataRobot SDK: OK
- Router → DataRobot SDK 直接: NG（必ずServiceを経由）
- Frontend → DataRobot API 直接: NG（必ずFastAPI経由）

---

## 4. Service定義

### DataRobotClient

```python
# fastapi_server/app/services/datarobot_client.py

import datarobot as dr
from functools import lru_cache
from typing import Any

class DataRobotClient:
    """DataRobot SDK操作のラッパー。キャッシュ付き。"""

    def __init__(self, endpoint: str, token: str):
        dr.Client(endpoint=endpoint, token=token)

    def get_deployment_info(self, deployment_id: str) -> dict:
        """デプロイメントメタ情報を取得"""
        deployment = dr.Deployment.get(deployment_id)
        model = dr.Model.get(
            project=deployment.model.get("project_id"),
            model_id=deployment.model.get("id"),
        )
        return {
            "deployment_id": deployment_id,
            "project_id": deployment.model.get("project_id"),
            "model_id": deployment.model.get("id"),
            "target": deployment.model.get("target_name"),
            "target_type": deployment.model.get("target_type"),
            "model_type": model.model_type,
            ...
        }

    def get_feature_impact(self, project_id: str, model_id: str) -> list[dict]:
        """Feature Impact取得（キャッシュ対象）"""
        model = dr.Model.get(project=project_id, model_id=model_id)
        fi = model.get_or_request_feature_impact()
        return fi

    def get_roc_curve(self, project_id: str, model_id: str, source: str) -> dict:
        """ROCカーブ取得"""
        model = dr.Model.get(project=project_id, model_id=model_id)
        roc = model.get_roc_curve(source)
        return {"auc": roc.auc, "roc_points": roc.roc_points}

    def get_lift_chart(self, project_id: str, model_id: str, source: str) -> dict:
        """リフトチャート取得"""
        model = dr.Model.get(project=project_id, model_id=model_id)
        lift = model.get_lift_chart(source)
        return {"bins": lift.bins}

    def get_confusion_matrix(self, project_id, model_id, threshold, source) -> dict:
        """混同行列取得（ROCデータから算出）"""
        ...

    def get_accuracy_metrics(self, project_id: str, model_id: str) -> list[dict]:
        """精度メトリクス一覧取得"""
        model = dr.Model.get(project=project_id, model_id=model_id)
        return model.metrics

    def get_feature_effects(self, project_id, model_id, feature_name) -> dict:
        """Feature Effects取得"""
        model = dr.Model.get(project=project_id, model_id=model_id)
        fe = model.get_or_request_feature_effect()
        # filter by feature_name
        ...

    def get_partial_dependence(self, project_id, model_id, feature_name) -> dict:
        """PDP取得"""
        model = dr.Model.get(project=project_id, model_id=model_id)
        pdp = model.get_all_partial_dependence_plots()
        # filter by feature_name
        ...

    def get_dataset_records(self, dataset_id, offset, limit) -> dict:
        """データセットレコード取得"""
        dataset = dr.Dataset.get(dataset_id)
        df = dataset.get_as_dataframe()
        # paginate
        ...

    def get_dataset_schema(self, dataset_id) -> dict:
        """データセットスキーマ取得"""
        dataset = dr.Dataset.get(dataset_id)
        ...

    def predict(self, deployment_id, data, max_explanations) -> dict:
        """予測実行"""
        # datarobot-predict ライブラリ使用
        # predictive-content-generator-main/nbo/predict.py のパターン参照
        ...
```

---

## 5. Pydanticスキーマ

data-model.md の「Pydanticスキーマ」セクションを参照。

**camelCase エイリアス**:
全レスポンススキーマは `model_config = ConfigDict(populate_by_name=True)` を設定し、
`Field(alias="camelCase")` でJSONレスポンスをcamelCaseにする。

```python
class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
```

---

## 6. 各エンドポイント詳細フロー

### 6.1 GET /api/v1/insights/{deployment_id}/feature-impact

```
Router (insights.py)
  │
  ├─ Depends(must_get_auth_ctx)  ← 認証チェック
  │
  ├─ deps = request.app.state.deps
  │
  ├─ dr_client = deps.datarobot_client
  │
  ├─ deployment_info = dr_client.get_deployment_info(deployment_id)
  │   └─ project_id, model_id を取得
  │
  ├─ feature_impact = dr_client.get_feature_impact(project_id, model_id)
  │   └─ DataRobot SDK: model.get_or_request_feature_impact()
  │   └─ 結果をキャッシュ（TTL 300秒）
  │
  └─ return FeatureImpactResponse(features=..., count=...)
```

### 6.2 POST /api/v1/predictions

```
Router (predictions.py)
  │
  ├─ Depends(must_get_auth_ctx)  ← 認証チェック
  │
  ├─ body = PredictionRequest をバリデーション
  │   └─ deployment_id, data(dict), max_explanations
  │
  ├─ deps = request.app.state.deps
  │
  ├─ dr_client = deps.datarobot_client
  │
  ├─ result = dr_client.predict(deployment_id, data, max_explanations)
  │   └─ datarobot-predict: _deployment_predict() 呼び出し
  │   └─ レスポンスCSVパース → PredictionResult構造化
  │   └─ 特徴量説明の抽出（EXPLANATION_1_FEATURE_NAME パターン）
  │
  └─ return PredictionResponse(prediction=..., explanations=...)
```

### 6.3 GET /api/v1/datasets/{dataset_id}/records

```
Router (datasets.py)
  │
  ├─ Depends(must_get_auth_ctx)  ← 認証チェック
  │
  ├─ query params: offset(0), limit(20), search(null)
  │
  ├─ deps = request.app.state.deps
  │
  ├─ dr_client = deps.datarobot_client
  │
  ├─ result = dr_client.get_dataset_records(dataset_id, offset, limit)
  │   └─ DataRobot SDK: Dataset.get(dataset_id).get_as_dataframe()
  │   └─ search フィルタ適用
  │   └─ offset/limit でスライス
  │
  └─ return DatasetRecordsResponse(records=..., total=..., columns=...)
```

### 6.4 POST /api/v1/chat (既存 — 変更なし)

```
Router (chat.py) ← 既存のまま
  │
  ├─ Depends(must_get_auth_ctx)
  │
  ├─ body = RunAgentInput
  │
  ├─ deps.stream_manager.run(run_input, user_uuid, agent_headers)
  │   └─ Agent Deployment に HTTP POST
  │   └─ SSE ストリーミング受信
  │
  └─ return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## 7. シーケンス図

### 7.1 Content画面: 顧客選択→予測→レター生成

```
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌──────────┐
│ Frontend │    │ FastAPI  │    │ DataRobot    │    │  Agent   │
│ (React)  │    │ Server   │    │ API          │    │          │
└────┬─────┘    └────┬─────┘    └──────┬───────┘    └────┬─────┘
     │               │                 │                  │
     │ GET /datasets/{id}/records      │                  │
     │──────────────►│                 │                  │
     │               │ Dataset.get()   │                  │
     │               │────────────────►│                  │
     │               │◄────────────────│                  │
     │◄──────────────│ records         │                  │
     │               │                 │                  │
     │ [User selects customer]         │                  │
     │               │                 │                  │
     │ POST /predictions               │                  │
     │──────────────►│                 │                  │
     │               │ predict()       │                  │
     │               │────────────────►│                  │
     │               │◄────────────────│                  │
     │◄──────────────│ prediction +    │                  │
     │               │ explanations    │                  │
     │               │                 │                  │
     │ [Display prediction card]       │                  │
     │               │                 │                  │
     │ POST /chat "承認レターを作成して" │                  │
     │──────────────►│                 │                  │
     │               │ forward to agent│                  │
     │               │──────────────────────────────────►│
     │               │                 │                  │
     │               │                 │    predict_customer()
     │               │                 │◄─────────────────│
     │               │                 │─────────────────►│
     │               │                 │                  │
     │               │                 │    LLM generates │
     │               │◄──────────────────────────────────│
     │◄──────────────│ SSE (letter)    │                  │
     │               │                 │                  │
```

### 7.2 Insights画面: ダッシュボード表示→チャット深堀り

```
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌──────────┐
│ Frontend │    │ FastAPI  │    │ DataRobot    │    │  Agent   │
└────┬─────┘    └────┬─────┘    └──────┬───────┘    └────┬─────┘
     │               │                 │                  │
     │ [Page load - parallel requests] │                  │
     │               │                 │                  │
     │ GET /insights/{id}/accuracy     │                  │
     │──────────────►│────────────────►│                  │
     │               │                 │                  │
     │ GET /insights/{id}/feature-impact                  │
     │──────────────►│────────────────►│                  │
     │               │                 │                  │
     │ GET /insights/{id}/roc          │                  │
     │──────────────►│────────────────►│                  │
     │               │                 │                  │
     │ GET /insights/{id}/lift         │                  │
     │──────────────►│────────────────►│                  │
     │               │                 │                  │
     │ GET /insights/{id}/confusion-matrix                │
     │──────────────►│────────────────►│                  │
     │               │                 │                  │
     │◄──────────────│ [all responses] │                  │
     │               │                 │                  │
     │ [Render all charts]             │                  │
     │               │                 │                  │
     │ POST /chat "なぜ年収が最重要？"  │                  │
     │──────────────►│──────────────────────────────────►│
     │               │                 │                  │
     │               │                 │ get_feature_impact()
     │               │                 │◄─────────────────│
     │               │                 │─────────────────►│
     │               │                 │                  │
     │               │                 │ get_feature_effects("annual_inc")
     │               │                 │◄─────────────────│
     │               │                 │─────────────────►│
     │               │                 │                  │
     │               │                 │ LLM interprets   │
     │               │◄──────────────────────────────────│
     │◄──────────────│ SSE (explanation)│                  │
```

---

## 8. エラーハンドリング

### 例外クラスとHTTPステータスマッピング

```python
# fastapi_server/app/services/datarobot_client.py

class DataRobotClientError(Exception):
    """DataRobot API呼び出しの一般エラー"""
    pass

class DeploymentNotFoundError(DataRobotClientError):
    """デプロイメントが見つからない"""
    pass

class ModelInsightNotAvailableError(DataRobotClientError):
    """インサイトがまだ計算されていない"""
    pass

class PredictionError(DataRobotClientError):
    """予測実行エラー"""
    pass

class DatasetNotFoundError(DataRobotClientError):
    """データセットが見つからない"""
    pass
```

```python
# fastapi_server/app/api/v1/insights.py

@insights_router.get("/{deployment_id}/feature-impact")
async def get_feature_impact(deployment_id: str, request: Request, ...):
    try:
        ...
    except DeploymentNotFoundError:
        raise HTTPException(status_code=404, detail="Deployment not found")
    except ModelInsightNotAvailableError:
        raise HTTPException(status_code=404, detail="Feature impact not yet computed")
    except DataRobotClientError as e:
        raise HTTPException(status_code=502, detail=f"DataRobot API error: {str(e)}")
```

| 例外 | HTTPステータス | 説明 |
|------|---------------|------|
| DeploymentNotFoundError | 404 | デプロイメントIDが無効 |
| ModelInsightNotAvailableError | 404 | インサイト未計算 |
| PredictionError | 502 | 予測APIエラー |
| DatasetNotFoundError | 404 | データセットIDが無効 |
| DataRobotClientError | 502 | その他DataRobotエラー |
| ValidationError (Pydantic) | 422 | リクエストバリデーション |
| TimeoutError | 504 | DataRobot APIタイムアウト |

---

## 9. トランザクション境界

### DB操作

本プロジェクトでは**新規DB書き込みは発生しない**。
- 既存のChat/Message永続化は既存コードがそのまま処理
- DataRobotインサイト/予測データはDB保存しない（リアルタイム取得）
- フィードバックはDataRobot APIに直接送信

### キャッシュ戦略

```
Backend (DataRobotClient)
  └─ functools.lru_cache or TTLCache (cachetools)
     └─ Feature Impact: TTL 300秒
     └─ ROC/Lift: TTL 300秒
     └─ Accuracy: TTL 300秒
     └─ Deployment Info: TTL 600秒
     └─ Dataset Schema: TTL 600秒
     └─ 予測結果: キャッシュなし（毎回実行）

Frontend (React Query)
  └─ staleTime: 60秒（全インサイトクエリ）
  └─ gcTime: 300秒
  └─ Predictions: staleTime 0（常に新鮮）
  └─ Dataset records: staleTime 60秒
```

---

## 10. 依存関係追加

### FastAPI Server (pyproject.toml)
```toml
[project.dependencies]
datarobot = ">=3.9.1"
datarobot-predict = ">=1.9.2"
cachetools = ">=5.3.0"
pandas = ">=2.0.3"
```

### MCP Server (pyproject.toml)
```toml
[project.dependencies]
datarobot = ">=3.9.1"
datarobot-predict = ">=1.9.2"
pandas = ">=2.0.3"
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "recharts": "^2.15.0"
  }
}
```

---

## 11. Infra ランタイムパラメータ追加

```python
# infra/infra/fastapi_server.py

# 以下のランタイムパラメータを metadata.yaml.jinja に追加:
# - PRED_AI_DEPLOYMENT_ID (string)
# - DATAROBOT_PROJECT_ID (string)
# - DATAROBOT_MODEL_ID (string)
# - DATASET_ID (string)
```

---

## 12. 実装順序（推奨）

```
Step 1: Backend サービス層
  └─ datarobot_client.py (DataRobot SDK接続・キャッシュ)
  └─ config.py 設定追加
  └─ deps.py に DataRobotClient 追加
  └─ pyproject.toml 依存追加

Step 2: Backend APIルーター
  └─ schemas/ (Pydanticスキーマ全定義)
  └─ insights.py (全インサイトエンドポイント)
  └─ predictions.py (予測エンドポイント)
  └─ datasets.py (データセットエンドポイント)
  └─ __init__.py にルーター登録

Step 3: MCP Server ツール
  └─ prediction_tools.py
  └─ insights_tools.py
  └─ metrics_tools.py
  └─ pyproject.toml 依存追加

Step 4: Agent
  └─ prompts.py (SYSTEM_PROMPT)
  └─ myagent.py (ワークフロー再設計)
  └─ workflow.yaml 更新

Step 5: Frontend API層
  └─ api/insights/ (requests, hooks, types, keys)
  └─ api/predictions/
  └─ api/datasets/
  └─ package.json (recharts追加)

Step 6: Frontend コンポーネント
  └─ shared/ (ChartCard, KPICard, GaugeChart, SideChat)
  └─ layout/ (AppLayout, NavigationSidebar, DashboardLayout)

Step 7: Frontend ページ
  └─ Landing.tsx
  └─ content/ (ContentPage + 全コンポーネント)
  └─ insights/ (InsightsPage + 全コンポーネント)
  └─ routesConfig.tsx, path.ts, App.tsx 更新

Step 8: Infra
  └─ fastapi_server.py ランタイムパラメータ追加
```
