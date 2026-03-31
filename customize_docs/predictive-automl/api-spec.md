# Predictive AutoML Agent API仕様

## メタデータ
- **作成日**: 2026-03-31
- **APIバージョン**: v1
- **ベースURL**: `/api/v1`
- **認証方式**: DataRobot Session (既存のDataRobotASGIMiddleware)

---

## 認証

既存のDataRobot認証ミドルウェアを使用。追加の認証は不要。
```
X-DATAROBOT-API-KEY: <scoped_api_key>  (自動付与)
```

---

## 共通仕様

### レスポンス形式
成功時は直接データを返却（既存のchatエンドポイントと同じパターン）。
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### エラーレスポンス
```json
{
  "detail": "Error message"
}
```

### HTTPステータスコード

| コード | 用途 |
|--------|------|
| 200 | 正常応答 |
| 400 | リクエスト不正（バリデーションエラー） |
| 401 | 認証失敗 |
| 404 | リソース不存在（デプロイメントID不正等） |
| 502 | DataRobot API呼び出し失敗 |
| 504 | DataRobot APIタイムアウト |

---

## エンドポイント一覧

### Insights API

| メソッド | パス | 説明 | 優先度 |
|---------|------|------|--------|
| GET | `/insights/{deployment_id}` | デプロイメント情報取得 | Must |
| GET | `/insights/{deployment_id}/feature-impact` | Feature Impact取得 | Must |
| GET | `/insights/{deployment_id}/roc` | ROC Curve取得 | Must |
| GET | `/insights/{deployment_id}/lift` | Lift Chart取得 | Must |
| GET | `/insights/{deployment_id}/confusion-matrix` | Confusion Matrix取得 | Must |
| GET | `/insights/{deployment_id}/accuracy` | 精度サマリー取得 | Must |
| GET | `/insights/{deployment_id}/feature-effects/{feature_name}` | Feature Effects取得 | Should |
| GET | `/insights/{deployment_id}/partial-dependence/{feature_name}` | PDP取得 | Should |
| GET | `/insights/{deployment_id}/word-cloud` | Word Cloudデータ取得 | Could |

### Predictions API

| メソッド | パス | 説明 | 優先度 |
|---------|------|------|--------|
| POST | `/predictions` | 予測実行 | Must |

### Datasets API

| メソッド | パス | 説明 | 優先度 |
|---------|------|------|--------|
| GET | `/datasets/{dataset_id}/records` | レコード取得 | Must |
| GET | `/datasets/{dataset_id}/schema` | スキーマ取得 | Must |

---

## Insights API 詳細

### GET `/api/v1/insights/{deployment_id}`

デプロイメントのメタ情報を取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |

**レスポンス 200**
```json
{
  "deploymentId": "64abc123def456",
  "projectId": "64abc123def789",
  "modelId": "64abc123def012",
  "target": "is_bad",
  "targetType": "Binary",
  "positiveClass": "1",
  "predictionThreshold": 0.42,
  "modelType": "Light Gradient Boosting on ElasticNet Predictions",
  "featureNames": ["annual_inc", "dti", "emp_length", "loan_amnt", "..."],
  "createdAt": "2026-03-30T12:00:00Z"
}
```

---

### GET `/api/v1/insights/{deployment_id}/feature-impact`

モデル全体の特徴量重要度を取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |

**レスポンス 200**
```json
{
  "features": [
    {
      "featureName": "annual_inc",
      "impactNormalized": 1.0,
      "impactUnnormalized": 0.1523,
      "redundantWith": null
    },
    {
      "featureName": "dti",
      "impactNormalized": 0.85,
      "impactUnnormalized": 0.1295,
      "redundantWith": null
    }
  ],
  "count": 15,
  "ranAt": "2026-03-31T10:00:00Z"
}
```

---

### GET `/api/v1/insights/{deployment_id}/roc`

ROC曲線データを取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |

**クエリパラメータ**

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|---|------|----------|------|
| source | string | No | validation | validation / crossValidation / holdout |

**レスポンス 200**
```json
{
  "auc": 0.923,
  "source": "validation",
  "rocPoints": [
    {"threshold": 0.0, "falsePositiveRate": 1.0, "truePositiveRate": 1.0},
    {"threshold": 0.1, "falsePositiveRate": 0.65, "truePositiveRate": 0.95},
    {"threshold": 0.5, "falsePositiveRate": 0.12, "truePositiveRate": 0.78},
    {"threshold": 1.0, "falsePositiveRate": 0.0, "truePositiveRate": 0.0}
  ]
}
```

---

### GET `/api/v1/insights/{deployment_id}/lift`

リフトチャートデータを取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |

**クエリパラメータ**

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|---|------|----------|------|
| source | string | No | validation | validation / crossValidation / holdout |

**レスポンス 200**
```json
{
  "source": "validation",
  "bins": [
    {"binWeight": 0.1, "actual": 0.42, "predicted": 0.85},
    {"binWeight": 0.1, "actual": 0.35, "predicted": 0.72},
    {"binWeight": 0.1, "actual": 0.28, "predicted": 0.55}
  ]
}
```

---

### GET `/api/v1/insights/{deployment_id}/confusion-matrix`

混同行列データを取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |

**クエリパラメータ**

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|---|------|----------|------|
| threshold | float | No | 0.5 | 分類閾値 (0.0-1.0) |
| source | string | No | validation | validation / crossValidation / holdout |

**レスポンス 200**
```json
{
  "threshold": 0.5,
  "source": "validation",
  "classes": ["0", "1"],
  "matrix": [[850, 30], [45, 275]],
  "metrics": {
    "accuracy": 0.9375,
    "precision": 0.9016,
    "recall": 0.8594,
    "f1": 0.88
  }
}
```

---

### GET `/api/v1/insights/{deployment_id}/accuracy`

主要精度メトリクス一覧を取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |

**レスポンス 200**
```json
{
  "metrics": [
    {"name": "AUC", "value": 0.923, "source": "validation"},
    {"name": "F1", "value": 0.88, "source": "validation"},
    {"name": "LogLoss", "value": 0.312, "source": "validation"},
    {"name": "Accuracy", "value": 0.9375, "source": "validation"}
  ],
  "optimizationMetric": "LogLoss"
}
```

---

### GET `/api/v1/insights/{deployment_id}/feature-effects/{feature_name}`

指定特徴量の効果データを取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |
| feature_name | string | Yes | 特徴量名 |

**レスポンス 200**
```json
{
  "featureName": "annual_inc",
  "featureType": "numeric",
  "partialDependence": [
    {"label": "20000", "dependence": 0.35},
    {"label": "40000", "dependence": 0.28},
    {"label": "60000", "dependence": 0.18},
    {"label": "80000", "dependence": 0.12},
    {"label": "100000", "dependence": 0.08}
  ]
}
```

---

### GET `/api/v1/insights/{deployment_id}/partial-dependence/{feature_name}`

Partial Dependence Plotデータを取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |
| feature_name | string | Yes | 特徴量名 |

**レスポンス 200**
```json
{
  "featureName": "annual_inc",
  "featureType": "numeric",
  "data": [
    {"value": 20000, "meanPrediction": 0.35},
    {"value": 40000, "meanPrediction": 0.28},
    {"value": 60000, "meanPrediction": 0.18},
    {"value": 80000, "meanPrediction": 0.12}
  ]
}
```

---

### GET `/api/v1/insights/{deployment_id}/word-cloud`

テキスト特徴量の重要語データを取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| deployment_id | string | Yes | DataRobotデプロイメントID |

**レスポンス 200**
```json
{
  "words": [
    {"text": "income", "weight": 0.95, "class": "positive"},
    {"text": "debt", "weight": 0.82, "class": "negative"},
    {"text": "employment", "weight": 0.71, "class": "positive"}
  ]
}
```

---

## Predictions API 詳細

### POST `/api/v1/predictions`

DataRobot予測デプロイメントで予測を実行。

**リクエストボディ**
```json
{
  "deploymentId": "64abc123def456",
  "data": {
    "annual_inc": 65000,
    "dti": 12.5,
    "emp_length": "5 years",
    "loan_amnt": 15000,
    "purpose": "credit_card"
  },
  "maxExplanations": 10
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| deploymentId | string | Yes | 予測デプロイメントID |
| data | object | Yes | 予測入力データ（1レコード分） |
| maxExplanations | integer | No (default: 10) | 返却する特徴量説明の最大数 |

**レスポンス 200**
```json
{
  "prediction": "0",
  "predictionProbability": 0.23,
  "classProbabilities": {
    "0": 0.77,
    "1": 0.23
  },
  "explanations": [
    {
      "featureName": "annual_inc",
      "featureValue": 65000,
      "strength": -0.15,
      "qualitativeStrength": "--",
      "label": "0"
    },
    {
      "featureName": "dti",
      "featureValue": 12.5,
      "strength": 0.08,
      "qualitativeStrength": "+",
      "label": "0"
    }
  ],
  "ngramExplanations": []
}
```

---

## Datasets API 詳細

### GET `/api/v1/datasets/{dataset_id}/records`

DataRobotデータセットからレコードを取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| dataset_id | string | Yes | DataRobotデータセットID |

**クエリパラメータ**

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|---|------|----------|------|
| offset | integer | No | 0 | 取得開始位置 |
| limit | integer | No | 20 | 取得件数 (max: 100) |
| search | string | No | null | テキスト検索（全カラム対象） |

**レスポンス 200**
```json
{
  "records": [
    {"annual_inc": 65000, "dti": 12.5, "emp_length": "5 years", "loan_amnt": 15000},
    {"annual_inc": 45000, "dti": 18.2, "emp_length": "2 years", "loan_amnt": 8000}
  ],
  "total": 1200,
  "offset": 0,
  "limit": 20,
  "columns": ["annual_inc", "dti", "emp_length", "loan_amnt", "purpose", "is_bad"]
}
```

---

### GET `/api/v1/datasets/{dataset_id}/schema`

データセットのカラム情報を取得。

**パスパラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|---|------|------|
| dataset_id | string | Yes | DataRobotデータセットID |

**レスポンス 200**
```json
{
  "columns": [
    {"name": "annual_inc", "type": "numeric", "min": 4000, "max": 350000, "uniqueCount": 892},
    {"name": "dti", "type": "numeric", "min": 0.0, "max": 35.0, "uniqueCount": 1150},
    {"name": "emp_length", "type": "categorical", "min": null, "max": null, "uniqueCount": 11},
    {"name": "is_bad", "type": "categorical", "min": null, "max": null, "uniqueCount": 2}
  ],
  "rowCount": 1200,
  "datasetName": "credit_risk_train"
}
```
