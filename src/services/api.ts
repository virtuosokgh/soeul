import axios from 'axios';
import type { PeriodType } from '../types';

const API_BASE = 'https://www.reb.or.kr/r-one/openapi';

// API 키는 환경변수에서 가져오거나 사용자가 입력하도록 설정
const API_KEY = import.meta.env.VITE_REB_API_KEY || '';

// CORS 프록시 (현재는 Vite/Vercel 프록시 사용으로 대체)
// 공개 CORS 프록시는 불안정하므로 Vite 프록시 또는 Vercel Functions 사용
// const CORS_PROXY = import.meta.env.VITE_CORS_PROXY || '';

// CORS 프록시를 통한 API 호출 헬퍼
// 로컬 개발: 더미 데이터 사용 (Vite 프록시 불안정)
// 프로덕션: Vercel Functions 사용 (/api/proxy)
function getApiUrl(path: string, params?: Record<string, string>): string {
  // 브라우저 환경
  if (typeof window !== 'undefined') {
    // 프로덕션 환경 확인 (Vercel 배포)
    const isProduction = import.meta.env.PROD || 
                         window.location.hostname.includes('vercel.app') ||
                         window.location.hostname.includes('netlify.app');
    
    if (isProduction) {
      // 프로덕션: Vercel Functions 사용
      const pathName = path.substring(1);
      const queryParams = new URLSearchParams();
      queryParams.append('path', pathName);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }
      
      const finalUrl = `/api/proxy?${queryParams.toString()}`;
      console.log('🔗 프로덕션: Vercel Functions URL:', finalUrl);
      return finalUrl;
    } else {
      // 로컬 개발: Vite 프록시 사용 (작동하지 않을 수 있음)
      const pathName = path.substring(1);
      const queryParams = new URLSearchParams();
      queryParams.append('path', pathName);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
      }
      
      const finalUrl = `/api/proxy?${queryParams.toString()}`;
      console.log('🔗 로컬 개발: Vite 프록시 URL (작동하지 않을 수 있음):', finalUrl);
      return finalUrl;
    }
  }
  
  // 서버 사이드에서는 직접 호출
  const baseUrl = `${API_BASE}${path}`;
  return baseUrl;
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
// XML을 파싱하는 헬퍼 함수
function parseXMLResponse(xmlString: string, rootTagName: string = 'row'): any {
  try {
    // XML 문자열을 파싱
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // 파싱 에러 확인
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('XML 파싱 에러:', parserError.textContent);
      return { data: [], result: { CODE: 'ERROR', MESSAGE: 'XML 파싱 에러' } };
    }
    
    // <row> 태그들을 찾아서 배열로 변환
    const rows = xmlDoc.getElementsByTagName(rootTagName);
    const data: any[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const item: any = {};
      
      // 모든 자식 요소를 객체로 변환
      for (let j = 0; j < row.children.length; j++) {
        const child = row.children[j];
        item[child.tagName] = child.textContent || '';
      }
      
      // 자식이 없으면 직접 속성 확인
      if (row.children.length === 0 && row.childNodes.length > 0) {
        for (let k = 0; k < row.childNodes.length; k++) {
          const node = row.childNodes[k];
          if (node.nodeType === 1) { // Element node
            item[node.nodeName] = node.textContent || '';
          }
        }
      }
      
      data.push(item);
    }
    
    // RESULT 정보 추출
    const resultElement = xmlDoc.getElementsByTagName('RESULT')[0];
    const code = resultElement?.getElementsByTagName('CODE')[0]?.textContent || '';
    const message = resultElement?.getElementsByTagName('MESSAGE')[0]?.textContent || '';
    
    return {
      data: data,
      result: {
        CODE: code,
        MESSAGE: message,
      }
    };
  } catch (error) {
    console.error('XML 파싱 실패:', error);
    return { data: [], result: { CODE: 'ERROR', MESSAGE: 'XML 파싱 실패' } };
  }
}

export async function fetchStatsTableList(key: string = API_KEY): Promise<ApiTableResponse> {
  try {
    const params = {
      key: key,
      type: 'json',
      pIndex: String(1),
      pSize: String(100)
    };
    
    // Vercel Functions 사용 시
    const url = getApiUrl('/SttsApiTbl.do', params);
    
    console.log('🌐 API 호출 URL:', url);
    
    const response = await axios.get(url, {
      // URL에 파라미터가 포함되어 있으므로 params 제외
      params: undefined,
      // CORS 문제 해결을 위한 설정
      withCredentials: false,
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
      },
      responseType: 'text', // XML을 받기 위해 text로 설정
    });
    
    console.log('✅ API 응답 성공:', response.status);
    console.log('응답 타입:', typeof response.data);
    
    // Vercel Functions 응답 처리 (data 필드에 실제 응답이 있을 수 있음)
    let actualData = response.data;
    if (typeof response.data === 'object' && response.data.data) {
      actualData = response.data.data;
      console.log('📄 Vercel Functions 응답 감지, data 필드 추출');
    }
    
    // 응답을 문자열로 변환하여 확인
    let responseStr = '';
    if (typeof actualData === 'string') {
      responseStr = actualData;
    } else if (typeof actualData === 'object') {
      responseStr = JSON.stringify(actualData);
    } else {
      responseStr = String(actualData);
    }
    
    console.log('응답 시작:', responseStr.substring(0, 300));
    
    // XML인지 JSON인지 확인
    let parsedData: any;
    if (responseStr.trim().startsWith('<?xml')) {
      console.log('📄 XML 응답 감지, 파싱 중...');
      parsedData = parseXMLResponse(responseStr, 'row');
      console.log('📄 파싱된 데이터 개수:', parsedData.data?.length || 0);
    } else {
      // JSON 문자열인 경우 (또는 이미 객체인 경우)
      try {
        if (typeof response.data === 'object') {
          parsedData = response.data;
          console.log('📄 이미 객체 형태의 응답');
        } else {
          parsedData = JSON.parse(responseStr);
          console.log('📄 JSON 문자열 파싱 성공');
        }
        
        console.log('📄 최상위 키:', Object.keys(parsedData));
        
        // allorigins.win이 XML을 JSON으로 변환한 경우 처리
        if (parsedData.SttsApiTbl) {
          console.log('📄 SttsApiTbl 구조 감지');
          const sttsData = parsedData.SttsApiTbl;
          console.log('📄 SttsApiTbl 타입:', Array.isArray(sttsData) ? '배열' : '객체');
          console.log('📄 SttsApiTbl 내용 샘플:', JSON.stringify(sttsData).substring(0, 1000));
          
          // row 배열 찾기
          let rows: any[] = [];
          if (Array.isArray(sttsData)) {
            // 배열인 경우: [{"head":[...], "row":[...]}]
            console.log('📄 배열 길이:', sttsData.length);
            for (let i = 0; i < sttsData.length; i++) {
              const item = sttsData[i];
              console.log(`📄 배열[${i}] 키:`, Object.keys(item));
              if (item.row) {
                rows = Array.isArray(item.row) ? item.row : [item.row];
                console.log('📄 row 배열 찾음, 개수:', rows.length);
                break;
              }
            }
          } else if (sttsData.row) {
            // 객체인 경우: {"head":[...], "row":[...]}
            rows = Array.isArray(sttsData.row) ? sttsData.row : [sttsData.row];
            console.log('📄 row 객체 찾음, 개수:', rows.length);
          }
          
          // RESULT 찾기
          let result = { CODE: '', MESSAGE: '' };
          if (Array.isArray(sttsData)) {
            for (const item of sttsData) {
              if (item.head) {
                const head = Array.isArray(item.head) ? item.head : [item.head];
                for (const h of head) {
                  if (h?.RESULT) {
                    result = h.RESULT;
                    break;
                  }
                }
                if (result.CODE) break;
              }
            }
          } else if (sttsData.head) {
            const head = Array.isArray(sttsData.head) ? sttsData.head : [sttsData.head];
            for (const h of head) {
              if (h?.RESULT) {
                result = h.RESULT;
                break;
              }
            }
          }
          
          parsedData = {
            data: rows,
            result: result
          };
          console.log('📄 최종 변환된 데이터 개수:', rows.length);
          if (rows.length > 0) {
            console.log('📄 첫 번째 데이터 샘플:', rows[0]);
          }
        } else {
          console.warn('📄 SttsApiTbl 구조를 찾을 수 없습니다.');
          console.warn('📄 사용 가능한 키:', Object.keys(parsedData));
          // 원본 데이터를 그대로 사용하되, data 필드가 없으면 빈 배열로 설정
          if (!parsedData.data) {
            parsedData.data = [];
          }
        }
      } catch (e) {
        console.warn('JSON 파싱 실패, XML로 시도:', e);
        parsedData = parseXMLResponse(responseStr, 'row');
      }
    }
    
    // SttsApiTbl이 있지만 아직 변환되지 않은 경우 - 항상 확인
    if (parsedData.SttsApiTbl) {
      console.log('📄 SttsApiTbl 발견, 변환 시도');
      const sttsData = parsedData.SttsApiTbl;
      console.log('📄 SttsApiTbl 타입:', Array.isArray(sttsData) ? '배열' : '객체');
      
      let rows: any[] = [];
      if (Array.isArray(sttsData)) {
        console.log('📄 배열 길이:', sttsData.length);
        for (let i = 0; i < sttsData.length; i++) {
          const item = sttsData[i];
          console.log(`📄 배열[${i}] 키:`, Object.keys(item));
          if (item.row) {
            rows = Array.isArray(item.row) ? item.row : [item.row];
            console.log('📄 row 배열 찾음, 개수:', rows.length);
            break;
          }
        }
      } else if (sttsData?.row) {
        rows = Array.isArray(sttsData.row) ? sttsData.row : [sttsData.row];
        console.log('📄 row 객체 찾음, 개수:', rows.length);
      }
      
      if (rows.length > 0) {
        // RESULT 찾기
        let result = { CODE: '', MESSAGE: '' };
        if (Array.isArray(sttsData)) {
          for (const item of sttsData) {
            if (item.head) {
              const head = Array.isArray(item.head) ? item.head : [item.head];
              for (const h of head) {
                if (h?.RESULT) {
                  result = h.RESULT;
                  break;
                }
              }
              if (result.CODE) break;
            }
          }
        } else if (sttsData.head) {
          const head = Array.isArray(sttsData.head) ? sttsData.head : [sttsData.head];
          for (const h of head) {
            if (h?.RESULT) {
              result = h.RESULT;
              break;
            }
          }
        }
        
        parsedData = {
          data: rows,
          result: result
        };
        console.log('📄 변환 성공, 데이터 개수:', rows.length);
        if (rows.length > 0) {
          console.log('📄 첫 번째 데이터 샘플:', rows[0]);
        }
      } else {
        console.warn('📄 row 배열을 찾을 수 없습니다.');
      }
    }
    
    // 최종 확인
    console.log('📄 최종 parsedData 구조:', {
      hasData: !!parsedData.data,
      dataLength: parsedData.data?.length || 0,
      hasResult: !!parsedData.result,
      keys: Object.keys(parsedData)
    });
    
    return parsedData;
  } catch (error: any) {
    console.error('❌ 통계표 목록 조회 실패:', error);
    
    // CORS 에러인지 확인
    if (error.message?.includes('CORS') || 
        error.code === 'ERR_NETWORK' || 
        error.response?.status === 0 ||
        error.message?.includes('blocked by CORS policy')) {
      console.error('🚫 CORS 에러 발생!');
      console.error('💡 해결 방법:');
      console.error('   1. .env 파일에 VITE_CORS_PROXY 설정 (공개 프록시 사용)');
      console.error('   2. 또는 Vercel/Netlify 서버리스 함수 사용');
      throw new Error('CORS 에러: 브라우저에서 직접 API 호출이 차단되었습니다.');
    }
    
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
    if (!tblCode || tblCode.trim() === '') {
      throw new Error('tblCode가 필수입니다.');
    }
    
    if (!key || key.trim() === '') {
      throw new Error('API 키가 필수입니다.');
    }
    
    const params = {
      key: key,
      tblCode: tblCode,
      type: 'json',
      pIndex: String(1),
      pSize: String(100)
    };
    
    const url = getApiUrl('/SttsApiTblItm.do', params);
    
    console.log('🌐 통계항목 API 호출 URL:', url);
    console.log('📋 통계표 코드:', tblCode);
    console.log('📋 전달할 파라미터:', params);
    
    const response = await axios.get(url, {
      params: undefined, // URL에 이미 포함되어 있음
      withCredentials: false,
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
      },
      responseType: 'text',
    });
    
    console.log('✅ 통계항목 API 응답 성공:', response.status);
    console.log('응답 시작:', response.data?.substring(0, 200));
    
    // XML인지 JSON인지 확인
    let parsedData;
    if (typeof response.data === 'string' && response.data.trim().startsWith('<?xml')) {
      console.log('📄 통계항목 XML 응답 감지, 파싱 중...');
      parsedData = parseXMLResponse(response.data, 'row');
      console.log('📄 파싱된 통계항목 개수:', parsedData.data?.length || 0);
      console.log('📄 파싱된 통계항목 샘플:', parsedData.data?.[0]);
    } else if (typeof response.data === 'object') {
      parsedData = response.data;
    } else {
      try {
        parsedData = JSON.parse(response.data);
        console.log('📄 JSON 파싱 성공, 구조:', Object.keys(parsedData));
        
        // allorigins.win이 XML을 JSON으로 변환한 경우 처리
        if (parsedData.SttsApiTbl || parsedData.SttsApiTblItm) {
          const sttsData = parsedData.SttsApiTbl || parsedData.SttsApiTblItm;
          
          // row 배열 찾기
          let rows: any[] = [];
          if (Array.isArray(sttsData)) {
            for (const item of sttsData) {
              if (item.row) {
                rows = Array.isArray(item.row) ? item.row : [item.row];
                break;
              }
            }
          } else if (sttsData?.row) {
            rows = Array.isArray(sttsData.row) ? sttsData.row : [sttsData.row];
          }
          
          // RESULT 찾기
          let result = { CODE: '', MESSAGE: '' };
          if (Array.isArray(sttsData)) {
            for (const item of sttsData) {
              if (item.head) {
                const head = Array.isArray(item.head) ? item.head[0] : item.head;
                if (head?.RESULT) {
                  result = head.RESULT;
                  break;
                }
              }
            }
          } else if (sttsData?.head) {
            const head = Array.isArray(sttsData.head) ? sttsData.head[0] : sttsData.head;
            if (head?.RESULT) {
              result = head.RESULT;
            }
          }
          
          parsedData = {
            data: rows,
            result: result
          };
          console.log('📄 변환된 통계항목 개수:', rows.length);
        }
      } catch (e) {
        console.warn('JSON 파싱 실패, XML로 시도:', e);
        parsedData = parseXMLResponse(response.data, 'row');
      }
    }
    
    return parsedData;
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
      pIndex: String(1),
      pSize: String(1000)
    };
    
    if (areaCode) {
      params.areaCode = areaCode;
    }

    const url = getApiUrl('/SttsApiTblData.do', params);
    
    const response = await axios.get(url, { 
      params: undefined,
      withCredentials: false,
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
      },
      responseType: 'text',
    });
    
    // XML인지 JSON인지 확인
    let parsedData;
    if (typeof response.data === 'string' && response.data.trim().startsWith('<?xml')) {
      parsedData = parseXMLResponse(response.data);
    } else if (typeof response.data === 'object') {
      parsedData = response.data;
    } else {
      try {
        parsedData = JSON.parse(response.data);
      } catch {
        parsedData = parseXMLResponse(response.data);
      }
    }
    
    return parsedData;
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
export function getComparisonDate(date: Date, _period: PeriodType, comparisonType: '전일' | '전주' | '전월' | '전년'): Date {
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

/**
 * 서울시 구 코드 매핑 (부동산 통계원 API에서 사용하는 코드)
 * 실제 API 응답에 맞게 조정 필요
 */
export const SEOUL_GU_CODE_MAP: Record<string, string> = {
  '강남구': '11680',
  '강동구': '11740',
  '강북구': '11305',
  '강서구': '11500',
  '관악구': '11620',
  '광진구': '11215',
  '구로구': '11530',
  '금천구': '11545',
  '노원구': '11350',
  '도봉구': '11320',
  '동대문구': '11230',
  '동작구': '11590',
  '마포구': '11440',
  '서대문구': '11410',
  '서초구': '11650',
  '성동구': '11200',
  '성북구': '11290',
  '송파구': '11710',
  '양천구': '11470',
  '영등포구': '11560',
  '용산구': '11170',
  '은평구': '11380',
  '종로구': '11110',
  '중구': '11140',
  '중랑구': '11260',
};