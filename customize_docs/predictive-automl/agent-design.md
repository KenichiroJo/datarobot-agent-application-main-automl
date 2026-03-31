# Predictive AutoML Agent — エージェント設計

## メタデータ
- **作成日**: 2026-03-31
- **関連仕様**: spec.md
- **バージョン**: 1.0.0

---

## 1. エージェントクラス

```python
# agent/agent/myagent.py

class MyAgent(LangGraphAgent):
    """DataRobot二値分類モデルのインサイト分析と予測コンテンツ生成を行うエージェント。"""
```

**制約**:
- クラス名 `MyAgent` は変更禁止
- `llm()` メソッドは変更禁止
- コードは `agent/agent/` ディレクトリ内のみ

---

## 2. ワークフロー設計（LangGraph StateGraph）

### ノード構成

```
                    ┌──────────────┐
                    │  START       │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  agent_node  │
                    │  (ReAct)     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  END         │
                    └──────────────┘
```

### 設計方針

シンプルな**シングルノードReActエージェント**を採用する。

**理由**:
1. LangGraphの`create_agent()`は内部でReActパターン（推論→ツール呼び出し→観察→推論…のループ）を実装済み
2. 4ノード（router/analyst/predictor/writer）に分割するとルーティング判断の精度がボトルネックになるリスク
3. ツール呼び出しの組み合わせはLLMの推論に任せた方が柔軟
4. 既存テンプレートのパターンを踏襲し、安定性を確保

### ノード定義

#### agent_node

全機能を1つのReActエージェントノードで処理。システムプロンプトでロールと振る舞いを定義し、MCPツール群を全て利用可能にする。

```python
@property
def agent_node(self) -> Any:
    return create_agent(
        self.llm(),
        tools=self.tools,  # MCP tools (prediction, insights, datasets, metrics)
        system_prompt=make_system_prompt(SYSTEM_PROMPT),
    )
```

---

## 3. システムプロンプト

```python
SYSTEM_PROMPT = """あなたは金融リスク分析の専門家であり、DataRobotの二値分類モデルを活用した予測分析とコンテンツ生成を行うAIアシスタントです。

## ロール
- **リスクアナリスト**: モデルインサイト（Feature Impact, ROC, Lift等）を解釈し、わかりやすく解説する
- **予測エキスパート**: 個別顧客の予測結果と特徴量説明を分析し、リスク要因を特定する
- **コンテンツライター**: 予測結果に基づく承認/却下レター、顧客向け説明、社内審査コメントを生成する

## 対応可能なタスク

### 1. モデル全体の分析
以下のツールを使ってモデルのインサイトを取得し、解説します:
- `get_feature_impact` — 特徴量の重要度分析
- `get_roc_curve` — ROC曲線とAUCの解説
- `get_lift_chart` — リフト効果の分析
- `get_confusion_matrix` — 混同行列の解説（閾値別）
- `get_model_accuracy` — 精度メトリクスの要約
- `get_feature_effects` — 特定特徴量の効果分析
- `get_partial_dependence` — Partial Dependence分析
- `get_word_cloud` — テキスト特徴量の重要語分析

### 2. 個別顧客の予測分析
- `predict_customer` — 顧客データで予測実行（確率、特徴量説明付き）
- `get_dataset_records` — データセットから顧客データを取得

### 3. コンテンツ生成
予測結果と特徴量説明を元に、以下のコンテンツを生成します:
- **承認レター**: フォーマルな承認通知。顧客名、承認条件、次のステップを含む
- **却下レター**: 丁寧な却下通知。主要な却下理由を一般的な表現で含む
- **顧客向け説明文書**: 専門用語を避けた平易な審査結果説明
- **社内審査コメント**: 技術的な審査記録。モデル予測確率、主要リスク因子、判断根拠を含む

## 振る舞いルール

1. **データに基づく**: 主観的な判断ではなく、モデルの出力とインサイトデータに基づいて回答する
2. **自然言語で解説**: 技術的なデータを非技術者にもわかるように解説する。ただし求められれば技術的な詳細も提供する
3. **構造化された回答**: チャートデータを解説する際はMarkdownテーブルや箇条書きを活用する
4. **コンテキスト活用**: 会話履歴を参照し、前の分析結果を踏まえた回答をする
5. **日本語対応**: ユーザーが日本語で質問した場合は日本語で回答する
"""
```

---

## 4. ツール構成

### MCP Server ツール（mcp_server/app/tools/）

| ファイル | ツール名 | 入力 | 出力 |
|---------|---------|------|------|
| prediction_tools.py | `predict_customer` | deployment_id, customer_data, max_explanations | 予測確率 + 説明 |
| prediction_tools.py | `get_dataset_records` | dataset_id, offset, limit, search | レコードリスト |
| insights_tools.py | `get_feature_impact` | deployment_id | 特徴量重要度リスト |
| insights_tools.py | `get_roc_curve` | deployment_id, source | ROCポイントリスト + AUC |
| insights_tools.py | `get_lift_chart` | deployment_id, source | リフトビンリスト |
| insights_tools.py | `get_confusion_matrix` | deployment_id, threshold, source | 混同行列 + メトリクス |
| insights_tools.py | `get_model_accuracy` | deployment_id | メトリクスリスト |
| insights_tools.py | `get_feature_effects` | deployment_id, feature_name | 効果ポイントリスト |
| insights_tools.py | `get_partial_dependence` | deployment_id, feature_name | PDPポイントリスト |
| insights_tools.py | `get_word_cloud` | deployment_id | ワードリスト |
| metrics_tools.py | `submit_feedback` | deployment_id, association_id, feedback | 成功/失敗 |

### ツール接続方式

エージェントは MCP Server 経由でツールにアクセス:
```
Agent → MCP Server (mcp_deployment_id or external_mcp_url) → DataRobot API
```

既存の `self.tools`（= `agent.mcp_tools`）で自動的にMCPツールが読み込まれる。

---

## 5. プロンプトテンプレート

```python
@property
def prompt_template(self) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("user", "{user_prompt_content}"),
    ])
```

ユーザーメッセージはそのまま渡す。コンテキスト（現在の画面、選択中の顧客等）はフロントエンドがメッセージに付与する。

---

## 6. 設定（config.py）

```python
# agent/agent/config.py に追加

# 既存設定は維持（llm_deployment_id, mcp_deployment_id, etc.）
# 追加設定は不要 — デプロイメントIDはMCPツールの引数として渡される
```

設計方針: エージェント自体にはデプロイメントIDをハードコードしない。ツール呼び出し時にフロントエンド/ユーザーから渡される。

---

## 7. workflow.yaml

```yaml
# agent/agent/workflow.yaml
name: predictive-automl-agent
description: >
  DataRobot二値分類モデルのインサイト分析と予測コンテンツ生成を行うエージェント。
  モデル全体のFeature Impact/ROC/Lift等の深堀り分析、個別顧客の予測と説明、
  承認/却下レター・説明文書・審査コメントの自動生成に対応。

skills:
  - name: model_analysis
    description: モデル全体のインサイト分析（Feature Impact, ROC, Lift, Confusion Matrix等）
  - name: customer_prediction
    description: 個別顧客の貸倒リスク予測と特徴量説明
  - name: content_generation
    description: 予測結果に基づく承認/却下レター、顧客説明、審査コメントの生成

llm:
  component: llm_gateway

auth:
  provider: datarobot
```

---

## 8. ディレクトリ構成

```
agent/agent/
├── __init__.py          # 既存
├── myagent.py           # 変更: ワークフロー・プロンプト・ノード再設計
├── config.py            # 変更なし
├── prompts.py           # 新規: SYSTEM_PROMPT定数
├── register.py          # 既存（変更なし）
└── workflow.yaml        # 変更: スキル定義更新
```

**注意**: `agent/agent/` 外のファイルは変更しない（AGENTS.md制約）。
