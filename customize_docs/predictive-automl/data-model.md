# Predictive AutoML Agent データモデル

## メタデータ
- **作成日**: 2026-03-31
- **関連仕様**: spec.md, api-spec.md
- **バージョン**: 1.0.0

---

## 方針

既存のデータモデル（Chat, Message, User, Identity等）は **変更しない**。
本プロジェクトでは**新規テーブルの追加は行わない**。

理由:
1. 予測データ・インサイトデータはDataRobot APIからリアルタイム取得する（永続化不要）
2. 生成コンテンツはチャットメッセージとして既存のMessage テーブルに保存される
3. フィードバックはDataRobotカスタムメトリクスに直接送信する（ローカルDB不要）

---

## 既存テーブル（変更なし）

### Chat テーブル
```
chat
├── uuid: UUID (PK)
├── name: str (default "New Chat")
├── thread_id: str | None
├── user_uuid: UUID (FK → user.uuid)
├── created_at: datetime
└── UNIQUE(thread_id, user_uuid)
```

### Message テーブル
```
message
├── uuid: UUID (PK)
├── chat_id: UUID (FK → chat.uuid, CASCADE)
├── role: Role (USER | ASSISTANT | TOOL | REASONING | DEVELOPER | SYSTEM)
├── content: str
├── created_at: datetime
├── tool_calls: list[MessageToolCall] (relationship)
└── reasonings: list[MessageReasoning] (relationship)
```

### User テーブル
```
user
├── id: int (PK, autoincrement)
├── uuid: UUID (default uuid4)
├── email: str (unique)
├── first_name: str | None
├── last_name: str | None
└── profile_image_url: str | None
```

---

## Pydantic スキーマ（API用 — DBモデルではない）

以下はFastAPIエンドポイント用のPydanticスキーマ。DBには保存しない。

### Insights スキーマ

```python
# fastapi_server/app/api/v1/schemas/insights.py

class DeploymentInfoResponse(BaseModel):
    deployment_id: str = Field(alias="deploymentId")
    project_id: str = Field(alias="projectId")
    model_id: str = Field(alias="modelId")
    target: str
    target_type: str = Field(alias="targetType")
    positive_class: str | None = Field(alias="positiveClass")
    prediction_threshold: float | None = Field(alias="predictionThreshold")
    model_type: str = Field(alias="modelType")
    feature_names: list[str] = Field(alias="featureNames")
    created_at: str = Field(alias="createdAt")

class FeatureImpactItem(BaseModel):
    feature_name: str = Field(alias="featureName")
    impact_normalized: float = Field(alias="impactNormalized")
    impact_unnormalized: float = Field(alias="impactUnnormalized")
    redundant_with: str | None = Field(alias="redundantWith", default=None)

class FeatureImpactResponse(BaseModel):
    features: list[FeatureImpactItem]
    count: int
    ran_at: str | None = Field(alias="ranAt", default=None)

class ROCPoint(BaseModel):
    threshold: float
    false_positive_rate: float = Field(alias="falsePositiveRate")
    true_positive_rate: float = Field(alias="truePositiveRate")

class ROCCurveResponse(BaseModel):
    auc: float
    source: str
    roc_points: list[ROCPoint] = Field(alias="rocPoints")

class LiftBin(BaseModel):
    bin_weight: float = Field(alias="binWeight")
    actual: float
    predicted: float

class LiftChartResponse(BaseModel):
    source: str
    bins: list[LiftBin]

class ConfusionMatrixResponse(BaseModel):
    threshold: float
    source: str
    classes: list[str]
    matrix: list[list[int]]
    metrics: dict  # accuracy, precision, recall, f1

class MetricItem(BaseModel):
    name: str
    value: float
    source: str

class AccuracyResponse(BaseModel):
    metrics: list[MetricItem]
    optimization_metric: str = Field(alias="optimizationMetric")

class FeatureEffectPoint(BaseModel):
    label: str
    dependence: float

class FeatureEffectsResponse(BaseModel):
    feature_name: str = Field(alias="featureName")
    feature_type: str = Field(alias="featureType")
    partial_dependence: list[FeatureEffectPoint] = Field(alias="partialDependence")

class PartialDependencePoint(BaseModel):
    value: float | str
    mean_prediction: float = Field(alias="meanPrediction")

class PartialDependenceResponse(BaseModel):
    feature_name: str = Field(alias="featureName")
    feature_type: str = Field(alias="featureType")
    data: list[PartialDependencePoint]

class WordCloudItem(BaseModel):
    text: str
    weight: float
    word_class: str = Field(alias="class")

class WordCloudResponse(BaseModel):
    words: list[WordCloudItem]
```

### Predictions スキーマ

```python
# fastapi_server/app/api/v1/schemas/predictions.py

class PredictionRequest(BaseModel):
    deployment_id: str = Field(alias="deploymentId")
    data: dict
    max_explanations: int = Field(alias="maxExplanations", default=10)

class ExplanationItem(BaseModel):
    feature_name: str = Field(alias="featureName")
    feature_value: Any = Field(alias="featureValue")
    strength: float
    qualitative_strength: str = Field(alias="qualitativeStrength")
    label: str

class PredictionResponse(BaseModel):
    prediction: str
    prediction_probability: float = Field(alias="predictionProbability")
    class_probabilities: dict = Field(alias="classProbabilities")
    explanations: list[ExplanationItem]
    ngram_explanations: list = Field(alias="ngramExplanations", default=[])
```

### Datasets スキーマ

```python
# fastapi_server/app/api/v1/schemas/datasets.py

class DatasetRecordsResponse(BaseModel):
    records: list[dict]
    total: int
    offset: int
    limit: int
    columns: list[str]

class ColumnInfo(BaseModel):
    name: str
    type: str
    min: float | None = None
    max: float | None = None
    unique_count: int | None = Field(alias="uniqueCount", default=None)

class DatasetSchemaResponse(BaseModel):
    columns: list[ColumnInfo]
    row_count: int = Field(alias="rowCount")
    dataset_name: str = Field(alias="datasetName")
```

---

## DBマイグレーション

**マイグレーションは不要**（既存テーブルの変更なし、新規テーブルの追加なし）。
