from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class DeploymentInfoResponse(_Base):
    deployment_id: str = Field(alias="deploymentId")
    project_id: str | None = Field(alias="projectId", default=None)
    model_id: str | None = Field(alias="modelId", default=None)
    target: str | None = Field(default=None)
    target_type: str = Field(alias="targetType", default="Binary")
    positive_class: str | None = Field(alias="positiveClass", default=None)
    prediction_threshold: float | None = Field(alias="predictionThreshold", default=None)
    model_type: str = Field(alias="modelType", default="")
    feature_names: Any = Field(alias="featureNames", default=[])
    created_at: str = Field(alias="createdAt", default="")


class FeatureImpactItem(_Base):
    feature_name: str = Field(alias="featureName")
    impact_normalized: float = Field(alias="impactNormalized")
    impact_unnormalized: float = Field(alias="impactUnnormalized")
    redundant_with: str | None = Field(alias="redundantWith", default=None)


class FeatureImpactResponse(_Base):
    features: list[FeatureImpactItem]
    count: int
    ran_at: str | None = Field(alias="ranAt", default=None)


class ROCPoint(_Base):
    threshold: float
    false_positive_rate: float = Field(alias="falsePositiveRate")
    true_positive_rate: float = Field(alias="truePositiveRate")


class ROCCurveResponse(_Base):
    auc: float
    source: str
    roc_points: list[ROCPoint] = Field(alias="rocPoints")


class LiftBin(_Base):
    bin_weight: float = Field(alias="binWeight")
    actual: float
    predicted: float


class LiftChartResponse(_Base):
    source: str
    bins: list[LiftBin]


class ConfusionMatrixResponse(_Base):
    threshold: float
    source: str
    classes: list[str]
    matrix: list[list[int]]
    metrics: dict[str, float]


class MetricItem(_Base):
    name: str
    value: float
    source: str


class AccuracyResponse(_Base):
    metrics: list[MetricItem]
    optimization_metric: str = Field(alias="optimizationMetric")


class FeatureEffectPoint(_Base):
    label: str
    dependence: float


class FeatureEffectsResponse(_Base):
    feature_name: str = Field(alias="featureName")
    feature_type: str = Field(alias="featureType")
    partial_dependence: list[FeatureEffectPoint] = Field(alias="partialDependence")


class PartialDependencePoint(_Base):
    value: float | str
    mean_prediction: float = Field(alias="meanPrediction")


class PartialDependenceResponse(_Base):
    feature_name: str = Field(alias="featureName")
    feature_type: str = Field(alias="featureType")
    data: list[PartialDependencePoint]


class WordCloudItem(_Base):
    text: str
    weight: float
    word_class: str = Field(alias="class")


class WordCloudResponse(_Base):
    words: list[WordCloudItem]
