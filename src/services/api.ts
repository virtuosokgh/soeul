import axios from 'axios';
import type { PeriodType, HousingPriceData } from '../types';

const API_BASE = 'https://www.reb.or.kr/r-one/openapi';

// API 키는 환경변수에서 가져오거나 사용자가 입력하도록 설정
const API_KEY = import.meta.env.VITE_REB_API_KEY || '';

// CORS 프록시 (필요한 경우 사용)
// 공개 CORS 프록시 서비스 사용 시 주의: 프로덕션에서는 자체 프록시 서버 사용 권장
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY || '';

// CORS 프록시를 통한 API 호출 헬퍼
function getApiUrl(path: string): string {
  if (CORS_PROXY && import.meta.env.PROD) {
    // 프로덕션에서 CORS 프록시 사용
    return `${CORS_PROXY}${API_BASE}${path}`;
  }
  return `${API_BASE}${path}`;
}

export interface ApiTableResponse {
  result?: any;
  data?: any[];
}

export interface ApiTableItemResponse {
  result?: any;
  data?: any[];
}

export interface ApiTableDataResponse {
  result?: any;
  data?: any[];
}

/**
 * 통계표 목록 조회
 */
export async function fetchStatsTableList(key: string = API_KEY): Promise<ApiTableResponse> {
  try {
    const response = await axios.get(getApiUrl('/SttsApiTbl.do'), {
      params: {
        key: key,
        type: 'json',
        pIndex: 1,
        pSize: 100
      },
      // CORS 문제 해결을 위한 설정
      withCredentials: false,
    });
    return response.data;
  } catch (error) {
    console.error('통계표 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * 통계항목 목록 조회
 */
export async function fetchStatsTableItems(
  tblCode: string,
  key: string = API_KEY
): Promise<ApiTableItemResponse> {
  try {
    const response = await axios.get(getApiUrl('/SttsApiTblItm.do'), {
      params: {
        key: key,
        tblCode: tblCode,
        type: 'json',
        pIndex: 1,
        pSize: 100
      },
      withCredentials: false,
    });
    return response.data;
  } catch (error) {
    console.error('통계항목 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * 통계 데이터 조회
 */
export async function fetchStatsTableData(
  tblCode: string,
  itmCode: string,
  date: string,
  areaCode?: string,
  key: string = API_KEY
): Promise<ApiTableDataResponse> {
  try {
    const params: Record<string, string> = {
      key: key,
      tblCode: tblCode,
      itmCode: itmCode,
      date: date,
      type: 'json',
      pIndex: 1,
      pSize: 1000
    };
    
    if (areaCode) {
      params.areaCode = areaCode;
    }

    const response = await axios.get(getApiUrl('/SttsApiTblData.do'), { 
      params,
      withCredentials: false,
    });
    return response.data;
  } catch (error) {
    console.error('통계 데이터 조회 실패:', error);
    throw error;
  }
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: Date, period: PeriodType): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case '일':
      return `${year}${month}${day}`;
    case '주':
      // 주 단위는 해당 주의 첫날을 기준으로 (간단히 월일로 표시)
      return `${year}${month}${day}`;
    case '월':
      return `${year}${month}`;
    case '연':
      return `${year}`;
    default:
      return `${year}${month}${day}`;
  }
}

/**
 * 비교 날짜 계산
 */
export function getComparisonDate(date: Date, period: PeriodType, comparisonType: '전일' | '전주' | '전월' | '전년'): Date {
  const newDate = new Date(date);
  
  switch (comparisonType) {
    case '전일':
      newDate.setDate(newDate.getDate() - 1);
      break;
    case '전주':
      newDate.setDate(newDate.getDate() - 7);
      break;
    case '전월':
      newDate.setMonth(newDate.getMonth() - 1);
      break;
    case '전년':
      newDate.setFullYear(newDate.getFullYear() - 1);
      break;
  }
  
  return newDate;
}

/**
 * 상승률 계산
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 서울시 구 목록
 */
export const SEOUL_GU_LIST = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
  '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
  '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
];