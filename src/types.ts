export type PeriodType = '일' | '주' | '월' | '연';

export interface ComparisonData {
  전일?: number;
  전주?: number;
  전월?: number;
  전년?: number;
}

export interface HistoryDataPoint {
  date: string;
  value: number;
  label: string;
}

export interface GuData {
  name: string;
  currentValue: number;
  comparison: ComparisonData;
  history?: HistoryDataPoint[]; // 과거 5개 기간 히스토리
}

export interface HousingPriceData {
  [guName: string]: GuData;
}