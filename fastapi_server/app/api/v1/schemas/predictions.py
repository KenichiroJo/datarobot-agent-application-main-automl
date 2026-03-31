from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class PredictionRequest(_Base):
    deployment_id: str = Field(alias="deploymentId")
    data: dict[str, Any]
    max_explanations: int = Field(alias="maxExplanations", default=10)


class ExplanationItem(_Base):
    feature_name: str = Field(alias="featureName")
    feature_value: Any = Field(alias="featureValue")
    strength: float
    qualitative_strength: str = Field(alias="qualitativeStrength")
    label: str


class PredictionResponse(_Base):
    prediction: str
    prediction_probability: float = Field(alias="predictionProbability")
    class_probabilities: dict[str, float] = Field(alias="classProbabilities")
    explanations: list[ExplanationItem]
    ngram_explanations: list[Any] = Field(alias="ngramExplanations", default=[])
