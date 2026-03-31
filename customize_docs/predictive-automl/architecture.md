# Predictive AutoML Agent — アーキテクチャ

## メタデータ
- **作成日**: 2026-03-31
- **関連仕様**: spec.md
- **バージョン**: 1.0.0

---

## 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DataRobot Platform                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  Custom Application                         │    │
│  │                                                             │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  FastAPI Server (port 8080)                         │   │    │
│  │  │  ┌───────────────────┐  ┌────────────────────────┐  │   │    │
│  │  │  │  React Frontend   │  │  REST API              │  │   │    │
│  │  │  │  (Static Files)   │  │  /api/v1/chat          │  │   │    │
│  │  │  │  - Landing        │  │  /api/v1/insights      │  │   │    │
│  │  │  │  - Content        │  │  /api/v1/predictions   │  │   │    │
│  │  │  │  - Insights       │  │  /api/v1/datasets      │  │   │    │
│  │  │  │  - Chat           │  │  /api/v1/oauth         │  │   │    │
│  │  │  └───────────────────┘  └──────────┬─────────────┘  │   │    │
│  │  │                                     │                │   │    │
│  │  │  ┌──────────────────────────────────┼────────────┐   │   │    │
│  │  │  │  Services                        │            │   │   │    │
│  │  │  │  ┌──────────────────┐  ┌────────▼─────────┐  │   │   │    │
│  │  │  │  │ DataRobotClient  │  │ AGUIStreamManager│  │   │   │    │
│  │  │  │  │ (SDK wrapper)    │  │ (Agent proxy)    │  │   │   │    │
│  │  │  │  └────────┬─────────┘  └────────┬─────────┘  │   │   │    │
│  │  │  │           │                      │            │   │   │    │
│  │  │  └───────────┼──────────────────────┼────────────┘   │   │    │
│  │  └──────────────┼──────────────────────┼────────────────┘   │    │
│  │                 │                      │                    │    │
│  └─────────────────┼──────────────────────┼────────────────────┘    │
│                    │                      │                         │
│  ┌─────────────────▼──────┐  ┌───────────▼───────────────────┐     │
│  │  DataRobot APIs         │  │  Agent Deployment (port 8842) │     │
│  │  - Prediction API       │  │  ┌─────────────────────────┐ │     │
│  │  - Model API            │  │  │  MyAgent (LangGraph)    │ │     │
│  │  - Dataset API          │  │  │  - ReAct agent node     │ │     │
│  │  - Deployment API       │  │  │  - System prompt        │ │     │
│  │                         │  │  │  - MCP tools            │ │     │
│  │                         │  │  └───────────┬─────────────┘ │     │
│  │                         │  └──────────────┼───────────────┘     │
│  │                         │                 │                      │
│  │                         │  ┌──────────────▼───────────────┐     │
│  │                         │  │  MCP Server Deployment        │     │
│  │                         │  │  ┌─────────────────────────┐ │     │
│  │                         │  │  │  prediction_tools.py    │ │     │
│  │                         │  │  │  insights_tools.py      │ │     │
│  │  ◄────────────────────────────│  metrics_tools.py       │ │     │
│  │                         │  │  └─────────────────────────┘ │     │
│  │                         │  └──────────────────────────────┘     │
│  └─────────────────────────┘                                       │
│                                                                     │
│  ┌─────────────────────────┐                                       │
│  │  LLM Gateway            │◄── Agent (via LiteLLM)                │
│  │  (GPT-4o / Claude etc.) │                                       │
│  └─────────────────────────┘                                       │
│                                                                     │
│  ┌─────────────────────────┐                                       │
│  │  Prediction Deployment  │◄── MCP Tools / Backend API             │
│  │  (Binary Classification)│                                       │
│  │  - 与信リスクモデル      │                                       │
│  └─────────────────────────┘                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## データフロー

### フロー1: ダッシュボード直接取得（チャットなし）

```
Frontend                FastAPI                  DataRobot API
   │                       │                          │
   │ GET /insights/{id}/   │                          │
   │  feature-impact       │                          │
   │──────────────────────►│                          │
   │                       │  dr.Model.get()          │
   │                       │  .get_or_request_        │
   │                       │   feature_impact()       │
   │                       │─────────────────────────►│
   │                       │◄─────────────────────────│
   │                       │  (cache result)          │
   │◄──────────────────────│                          │
   │  FeatureImpactResponse│                          │
   │  → Recharts render    │                          │
```

### フロー2: チャット経由での分析（エージェント使用）

```
Frontend        FastAPI       Agent          MCP Server     DataRobot
   │               │            │                │              │
   │ POST /chat    │            │                │              │
   │ (SSE stream)  │            │                │              │
   │──────────────►│            │                │              │
   │               │ forward    │                │              │
   │               │───────────►│                │              │
   │               │            │ LLM reasoning  │              │
   │               │            │ "need feature  │              │
   │               │            │  impact data"  │              │
   │               │            │                │              │
   │               │            │ call tool:     │              │
   │               │            │ get_feature_   │              │
   │               │            │ impact         │              │
   │               │            │───────────────►│              │
   │               │            │                │ dr.Model     │
   │               │            │                │ .feature_    │
   │               │            │                │  impact()    │
   │               │            │                │─────────────►│
   │               │            │                │◄─────────────│
   │               │            │◄───────────────│              │
   │               │            │                │              │
   │               │            │ LLM interprets │              │
   │               │            │ data & responds│              │
   │               │◄───────────│ (stream)       │              │
   │◄──────────────│ SSE events │                │              │
   │ display       │            │                │              │
```

### フロー3: 予測→コンテンツ生成

```
Frontend        FastAPI       Agent          MCP Server     DataRobot
   │               │            │                │              │
   │ (1) GET /datasets/{id}/records               │              │
   │──────────────►│────────────────────────────────────────────►│
   │◄──────────────│◄───────────────────────────────────────────│
   │ select customer                              │              │
   │               │            │                │              │
   │ (2) POST /predictions                        │              │
   │──────────────►│────────────────────────────────────────────►│
   │◄──────────────│◄───────────────────────────────────────────│
   │ show prediction card       │                │              │
   │               │            │                │              │
   │ (3) POST /chat "承認レターを作成して"          │              │
   │──────────────►│───────────►│                │              │
   │               │            │ predict_customer│              │
   │               │            │───────────────►│─────────────►│
   │               │            │◄───────────────│◄─────────────│
   │               │            │                │              │
   │               │            │ LLM generates  │              │
   │               │            │ approval letter│              │
   │               │◄───────────│ (stream)       │              │
   │◄──────────────│ SSE        │                │              │
   │ show letter   │            │                │              │
```

---

## コンポーネント間通信

| 接続 | プロトコル | 認証 |
|------|----------|------|
| Frontend → FastAPI | HTTP/HTTPS + SSE | Session Cookie |
| FastAPI → Agent | HTTP + SSE | AGENT_DEPLOYMENT_TOKEN |
| FastAPI → DataRobot API | HTTPS | DATAROBOT_API_TOKEN |
| Agent → MCP Server | HTTP (MCP Protocol) | MCP_DEPLOYMENT_ID |
| Agent → LLM Gateway | HTTP | API Key (via LiteLLM) |
| MCP Server → DataRobot API | HTTPS | DATAROBOT_API_TOKEN |

---

## デプロイメント構成

```
dr task run infra:up-yes
  │
  ├── CustomApplication (FastAPI + React)
  │     └── Runtime Params:
  │           AGENT_DEPLOYMENT_URL
  │           MCP_DEPLOYMENT_ID
  │           PRED_AI_DEPLOYMENT_ID    ← 新規
  │           DATAROBOT_PROJECT_ID     ← 新規
  │           DATAROBOT_MODEL_ID       ← 新規
  │           DATASET_ID               ← 新規
  │           SESSION_SECRET_KEY
  │           DATABASE_URI
  │
  ├── CustomModel (Agent)
  │     └── target_type: agenticworkflow
  │         environment: Python 3.11 GenAI
  │
  └── CustomModel (MCP Server)
        └── target_type: MCP
            tools: prediction_tools, insights_tools, metrics_tools
```

---

## ローカル開発

```bash
dr run dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:8080
# → Agent:    http://localhost:8842
# → MCP:      http://localhost:8082

# 環境変数（.env）
DATAROBOT_API_TOKEN=xxx
DATAROBOT_ENDPOINT=https://app.datarobot.com/api/v2
PRED_AI_DEPLOYMENT_ID=xxx
DATAROBOT_PROJECT_ID=xxx
DATAROBOT_MODEL_ID=xxx
DATASET_ID=xxx
```
