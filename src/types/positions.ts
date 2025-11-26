export interface Position {
  id: string;
  name: string;
  hour_value: number;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePositionData {
  name: string;
  hour_value?: number;
  company_id: string;
}

export interface UpdatePositionData {
  name?: string;
  hour_value?: number;
}

export interface PositionsResponse {
  positions: Position[];
  total: number;
}
