from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class DatasetRecordsResponse(_Base):
    records: list[dict]
    total: int
    offset: int
    limit: int
    columns: list[str]


class ColumnInfo(_Base):
    name: str
    type: str
    min: float | None = None
    max: float | None = None
    unique_count: int | None = Field(alias="uniqueCount", default=None)


class DatasetSchemaResponse(_Base):
    columns: list[ColumnInfo]
    row_count: int = Field(alias="rowCount")
