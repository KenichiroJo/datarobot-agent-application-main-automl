export interface DatasetRecordsResponse {
  records: Record<string, any>[];
  total: number;
  offset: number;
  limit: number;
  columns: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  min?: number;
  max?: number;
  uniqueCount?: number;
}

export interface DatasetSchemaResponse {
  columns: ColumnInfo[];
  rowCount: number;
}
