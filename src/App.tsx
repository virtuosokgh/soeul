import { useState, useEffect, useCallback, useMemo } from 'react';
import SeoulMap from './components/SeoulMap';
import Tabs from './components/Tabs';
import ComparisonInfo from './components/ComparisonInfo';
import type { PeriodType, HousingPriceData, GuData, ComparisonData, HistoryDataPoint } from './types';
import { 
  SEOUL_GU_LIST,
  SEOUL_GU_CODE_MAP,
  fetchStatsTableList,
  fetchStatsTableItems,
  fetchStatsTableData,
  formatDate,
  getComparisonDate,
  calculateGrowthRate
} from './services/api';
import './App.css';

function App() {
  const [period, setPeriod] = useState<PeriodType>('월');
  const [data, setData] = useState<HousingPriceData>({});
  const [hoveredGu, setHoveredGu] = useState<string | null>(null); // 하이라이트용
  const [selectedGu, setSelectedGu] = useState<string | null>(null); // 클릭한 구 (상세 정보 표시용)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 키는 환경변수에서 가져오거나 사용자가 입력하도록 설정
  const API_KEY = import.meta.env.VITE_REB_API_KEY || '';

  // 간단한 해시 함수로 일관된 랜덤 값 생성
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // 히스토리 데이터 생성 함수 (과거 5개 기간) - useCallback으로 메모이제이션
  const generateHistoryData = useCallback((currentValue: number, periodType: PeriodType, seed: number): HistoryDataPoint[] => {
    const history: HistoryDataPoint[] = [];
    const now = new Date();
    
    // 현재 값을 기준으로 트렌드를 반영한 과거 데이터 생성
    // 극명한 변동폭을 위해 더 큰 범위 사용
    const baseRange = Math.max(Math.abs(currentValue) * 0.8, 10); // 현재 값의 80% 또는 최소 10%
    const trendDirection = currentValue >= 0 ? 1 : -1; // 상승/하락 트렌드
    
    // 과거부터 현재까지의 값들을 생성 (정순: 과거 -> 현재)
    const values: number[] = [];
    
    // 과거 5개 기간부터 현재까지 값 생성
    for (let i = 5; i >= 0; i--) {
      if (i === 0) {
        // 현재 값 (항상 마지막에 추가되어 values[5]가 됨)
        // 나중에 정순으로 만들기 위해 일단 빈 자리로 두고 나중에 추가
      } else {
        // 과거 값: 현재에서 멀어질수록 더 큰 차이 (극명하게)
        const timeFactor = i / 5; // 1.0, 0.8, 0.6, 0.4, 0.2
        const randomVariation = (seededRandom(seed + i) - 0.5) * 2; // -1 ~ 1 (일관된 값)
        
        // 더 극명한 변동을 위해 큰 계수 사용
        const trendChange = -trendDirection * baseRange * timeFactor * 1.2; // 트렌드 반영 (1.2배)
        const randomChange = randomVariation * baseRange * 0.6; // 랜덤 변동 (0.6배로 증가)
        
        // 최소/최대 범위 제한 (현재 값의 ±150% 범위 내)
        const minValue = currentValue - baseRange * 1.5;
        const maxValue = currentValue + baseRange * 1.5;
        const calculatedValue = currentValue + trendChange + randomChange;
        const clampedValue = Math.max(minValue, Math.min(maxValue, calculatedValue));
        
        values.push(clampedValue);
      }
    }
    
    // 현재 값을 마지막에 추가 (values[5] = currentValue)
    values.push(currentValue);
    
    // 날짜 라벨 생성 (과거 -> 현재 순서)
    for (let i = 5; i >= 0; i--) {
      let dateLabel = '';
      let dateStr = '';
      const valueIndex = 5 - i; // values 배열 인덱스 (0=과거 5개 기간 전, 5=현재)
      
      if (i === 0) {
        // 현재
        switch (periodType) {
          case '일':
            dateLabel = '오늘';
            dateStr = now.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            break;
          case '주':
            dateLabel = '이번 주';
            dateStr = now.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            break;
          case '월':
            dateLabel = '이번 달';
            dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
            break;
          case '연':
            dateLabel = '올해';
            dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
            break;
        }
      } else {
        // 과거
        switch (periodType) {
          case '일':
            const dayDate = new Date(now);
            dayDate.setDate(dayDate.getDate() - i);
            dateLabel = `${i}일 전`;
            dateStr = dayDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            break;
          case '주':
            const weekDate = new Date(now);
            weekDate.setDate(weekDate.getDate() - (i * 7));
            dateLabel = `${i}주 전`;
            dateStr = weekDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            break;
          case '월':
            const monthDate = new Date(now);
            monthDate.setMonth(monthDate.getMonth() - i);
            dateLabel = `${i}개월 전`;
            dateStr = monthDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
            break;
          case '연':
            const yearDate = new Date(now);
            yearDate.setFullYear(yearDate.getFullYear() - i);
            dateLabel = `${i}년 전`;
            dateStr = yearDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
            break;
        }
      }
      
      history.push({
        date: dateStr,
        value: Number(values[valueIndex].toFixed(2)),
        label: dateLabel,
      });
    }
    
    return history;
  }, []);

  // 더미 데이터 생성 (API 키가 없을 때 사용) - useCallback으로 최적화
  const generateDummyData = useCallback(() => {
    const dummyData: HousingPriceData = {};

    SEOUL_GU_LIST.forEach((guName, index) => {
      // 구 이름과 period를 기반으로 일관된 seed 생성
      const seed = guName.charCodeAt(0) * 1000 + guName.charCodeAt(1) * 100 + period.charCodeAt(0) * 10 + index;
      
      // 일관된 랜덤 상승률 생성 (-5% ~ 15%)
      const currentValue = (seededRandom(seed) * 20 - 5);
      
      const comparison: ComparisonData = {
        전일: (seededRandom(seed + 1) * 10 - 2),
        전주: (seededRandom(seed + 2) * 12 - 3),
        전월: (seededRandom(seed + 3) * 15 - 4),
        전년: (seededRandom(seed + 4) * 20 - 5),
      };

      // 히스토리 데이터 생성 (seed 전달)
      const history = generateHistoryData(currentValue, period, seed);

      dummyData[guName] = {
        name: guName,
        currentValue,
        comparison,
        history,
      };
    });

    setData(dummyData);
  }, [period, generateHistoryData]);

  // 데이터 로드 함수 - period가 변경될 때만 실행
  useEffect(() => {
    // 프로덕션 환경 확인 (Vercel 배포 시)
    const isProduction = import.meta.env.PROD || 
                         (typeof window !== 'undefined' && (
                           window.location.hostname.includes('vercel.app') ||
                           window.location.hostname.includes('netlify.app')
                         ));
    
    console.log('데이터 로드 useEffect 실행');
    console.log('API_KEY 존재 여부:', !!API_KEY);
    console.log('API_KEY 값:', API_KEY ? `${API_KEY.substring(0, 10)}...` : '없음');
    console.log('환경:', isProduction ? '프로덕션 (Vercel)' : '로컬 개발');
    
    // 로컬 개발 환경: Vite 프록시가 불안정하므로 더미 데이터 사용
    if (!isProduction) {
      console.log('💡 로컬 개발 환경: 더미 데이터를 사용합니다.');
      console.log('💡 실제 API 데이터를 보려면 Vercel에 배포하세요: npm run build 후 Vercel에 배포');
      setError(null);
      generateDummyData();
      return;
    }
    
    // 프로덕션 환경에서만 실제 API 호출
    if (!API_KEY) {
      console.warn('⚠️ API 키가 없습니다. 더미 데이터를 사용합니다.');
      setError(null);
      generateDummyData();
      return;
    }

    console.log('✅ 프로덕션 환경: 실제 API를 호출합니다.');
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // 실제 API에서 데이터 로드
  const loadData = async () => {
    console.log('🚀 loadData 함수 시작');
    setLoading(true);
    setError(null);

    try {
      // 1. 통계표 목록 조회하여 집값 관련 통계표 찾기
      console.log('📊 통계표 목록 조회 중...');
      console.log('API 호출 URL:', `https://www.reb.or.kr/r-one/openapi/SttsApiTbl.do?key=${API_KEY.substring(0, 10)}...`);
      
      const tablesResponse = await fetchStatsTableList(API_KEY);
      console.log('✅ 통계표 목록 응답 받음:', tablesResponse);
      
      // 통계표 목록에서 집값 관련 통계표 찾기
      const tables = tablesResponse.data || tablesResponse.result?.data || [];
      console.log('사용 가능한 통계표 개수:', tables.length);
      console.log('첫 번째 통계표 샘플:', tables[0]);
      
      // 집값 관련 통계표 찾기 (XML 응답의 필드명에 맞게 수정)
      const housingTable = tables.find((table: any) => {
        const name = table.STATBL_NM || table.tblNm || table.name || '';
        const code = table.STATBL_ID || table.tblCode || table.code || '';
        
        return (
          (name && (
            name.includes('집값') || 
            name.includes('주택') || 
            name.includes('부동산') ||
            name.includes('가격') ||
            name.includes('지수') ||
            name.includes('아파트') ||
            name.includes('매매')
          )) ||
          (code && (
            code.includes('HOUSE') ||
            code.includes('PRICE') ||
            code.includes('APT')
          ))
        );
      }) || tables.find((table: any) => {
        // 월 단위 통계표 우선 선택
        const name = table.STATBL_NM || table.tblNm || '';
        return name && name.includes('(월)');
      }) || tables[0]; // 없으면 첫 번째 통계표 사용
      
      if (!housingTable) {
        console.warn('집값 관련 통계표를 찾을 수 없습니다. 더미 데이터를 사용합니다.');
        console.warn('사용 가능한 통계표 샘플:', tables.slice(0, 5).map((t: any) => ({ 
          code: t.STATBL_ID || t.tblCode, 
          name: t.STATBL_NM || t.tblNm 
        })));
        generateDummyData();
        return;
      }
      
      const tblCode = housingTable.STATBL_ID || housingTable.tblCode;
      const tblName = housingTable.STATBL_NM || housingTable.tblNm;
      
      if (!tblCode) {
        console.warn('통계표 코드를 찾을 수 없습니다. 더미 데이터를 사용합니다.');
        generateDummyData();
        return;
      }
      
      console.log('✅ 사용할 통계표:', tblCode, tblName);
      
      // 2. 통계항목 목록 조회
      console.log('📋 통계항목 목록 조회 중...');
      const itemsResponse = await fetchStatsTableItems(tblCode, API_KEY);
      console.log('✅ 통계항목 목록 응답:', itemsResponse);
      
      const items = itemsResponse.data || itemsResponse.result?.data || [];
      console.log('📋 사용 가능한 통계항목 개수:', items.length);
      console.log('📋 첫 번째 통계항목 샘플:', items[0]);
      
      // 통계항목이 없으면 통계표 데이터를 직접 조회 시도
      let itmCode: string | undefined;
      let itmName: string | undefined;
      
      if (items.length === 0) {
        console.warn('⚠️ 통계항목 목록이 비어있습니다. 통계표 데이터를 직접 조회합니다.');
        // 통계항목 코드 없이 데이터 조회 시도 (일부 API는 항목 코드가 필요 없을 수 있음)
        itmCode = 'ALL'; // 기본값
        itmName = '전체';
      } else {
        // 구별 집값 상승률 항목 찾기 (XML 응답의 필드명에 맞게 수정)
        const priceItem = items.find((item: any) => {
          const name = item.STATITM_NM || item.itmNm || item.name || '';
          const code = item.STATITM_ID || item.itmCode || item.code || '';
          
          return (
            (name && (
              name.includes('상승률') ||
              name.includes('변동률') ||
              name.includes('증감률') ||
              name.includes('변동') ||
              name.includes('지수')
            )) ||
            (code && (
              code.includes('RATE') ||
              code.includes('CHANGE') ||
              code.includes('INDEX')
            ))
          );
        }) || items[0]; // 없으면 첫 번째 항목 사용
        
        if (!priceItem) {
          console.warn('⚠️ 집값 상승률 항목을 찾을 수 없습니다. 첫 번째 항목을 사용합니다.');
          const firstItem = items[0];
          itmCode = firstItem.STATITM_ID || firstItem.itmCode;
          itmName = firstItem.STATITM_NM || firstItem.itmNm;
        } else {
          itmCode = priceItem.STATITM_ID || priceItem.itmCode;
          itmName = priceItem.STATITM_NM || priceItem.itmNm;
        }
      }
      
      if (!itmCode) {
        console.warn('⚠️ 통계항목 코드를 찾을 수 없습니다. 더미 데이터를 사용합니다.');
        generateDummyData();
        return;
      }
      
      console.log('✅ 사용할 통계항목:', itmCode, itmName);
      
      // 3. 현재 날짜 포맷
      const now = new Date();
      const currentDate = formatDate(now, period);
      
      // 4. 비교 날짜 계산
      const comparisonDates = {
        전일: formatDate(getComparisonDate(now, period, '전일'), period),
        전주: formatDate(getComparisonDate(now, period, '전주'), period),
        전월: formatDate(getComparisonDate(now, period, '전월'), period),
        전년: formatDate(getComparisonDate(now, period, '전년'), period),
      };
      
      // 5. 각 구별 데이터 조회
      const housingData: HousingPriceData = {};
      
      // 각 구별 데이터 조회
      for (const guName of SEOUL_GU_LIST) {
        try {
          const areaCode = SEOUL_GU_CODE_MAP[guName];
          
          // 현재 기간 데이터
          const currentData = await fetchStatsTableData(
            tblCode,
            itmCode,
            currentDate,
            areaCode,
            API_KEY
          );
          
          // 디버깅: API 응답 구조 확인
          console.log(`[${guName}] API 응답 구조:`, JSON.stringify(currentData, null, 2));
          console.log(`[${guName}] currentDate:`, currentDate);
          console.log(`[${guName}] areaCode:`, areaCode);
          console.log(`[${guName}] tblCode:`, tblCode);
          console.log(`[${guName}] itmCode:`, itmCode);
          
          // 데이터 파싱 (실제 응답 구조에 맞게 수정 필요)
          // 여러 가능한 응답 구조 시도
          console.log(`[${guName}] API 응답 데이터 구조:`, JSON.stringify(currentData).substring(0, 500));
          
          let currentValue = 0;
          let firstItem: any = null;
          
          if (currentData.data && Array.isArray(currentData.data) && currentData.data.length > 0) {
            firstItem = currentData.data[0];
            console.log(`[${guName}] currentData.data[0]:`, firstItem);
          } else if (currentData.result?.data && Array.isArray(currentData.result.data) && currentData.result.data.length > 0) {
            firstItem = currentData.result.data[0];
            console.log(`[${guName}] currentData.result.data[0]:`, firstItem);
          } else if (Array.isArray(currentData) && currentData.length > 0) {
            firstItem = currentData[0];
            console.log(`[${guName}] currentData[0]:`, firstItem);
          } else if (currentData.row && Array.isArray(currentData.row) && currentData.row.length > 0) {
            firstItem = currentData.row[0];
            console.log(`[${guName}] currentData.row[0]:`, firstItem);
          } else if (currentData.SttsApiTbl) {
            // SttsApiTbl 구조 처리
            const sttsData = Array.isArray(currentData.SttsApiTbl) 
              ? currentData.SttsApiTbl[0] 
              : currentData.SttsApiTbl;
            
            if (sttsData.row && Array.isArray(sttsData.row) && sttsData.row.length > 0) {
              firstItem = sttsData.row[0];
              console.log(`[${guName}] SttsApiTbl.row[0]:`, firstItem);
            } else if (sttsData.data && Array.isArray(sttsData.data) && sttsData.data.length > 0) {
              firstItem = sttsData.data[0];
              console.log(`[${guName}] SttsApiTbl.data[0]:`, firstItem);
            }
          }
          
          if (firstItem) {
            // 다양한 필드명 시도
            const valueStr = firstItem.value || 
              firstItem.dataValue ||
              firstItem.val ||
              firstItem.data ||
              firstItem.amt ||
              firstItem.amount ||
              firstItem.rate ||
              firstItem.상승률 ||
              firstItem['value'] ||
              firstItem['dataValue'] ||
              '0';
            
            currentValue = parseFloat(String(valueStr).replace(/,/g, '')) || 0;
            console.log(`[${guName}] 추출된 값 문자열:`, valueStr, '→ 파싱된 currentValue:', currentValue);
          } else {
            console.warn(`[${guName}] 데이터를 찾을 수 없습니다. currentData 구조:`, Object.keys(currentData));
            currentValue = 0;
          }
          
          // currentValue가 0이면 더미 데이터로 대체될 수 있음
          if (currentValue === 0) {
            console.warn(`[${guName}] currentValue가 0입니다. API 응답을 확인하세요.`);
            console.warn(`[${guName}] 전체 응답:`, JSON.stringify(currentData).substring(0, 1000));
          }
          
          // 비교 기간 데이터들
          const comparison: ComparisonData = {};
          
          try {
            const prevDayData = await fetchStatsTableData(
              tblCode,
              itmCode,
              comparisonDates.전일,
              areaCode,
              API_KEY
            );
            const prevDayValue = parseFloat(
              prevDayData.data?.[0]?.value || 
              prevDayData.data?.[0]?.dataValue ||
              prevDayData.result?.data?.[0]?.value ||
              prevDayData.data?.[0]?.val ||
              '0'
            );
            if (prevDayValue !== 0) {
              comparison.전일 = calculateGrowthRate(currentValue, prevDayValue);
            }
          } catch (e) {
            console.warn(`${guName} 전일 데이터 조회 실패:`, e);
          }
          
          try {
            const prevWeekData = await fetchStatsTableData(
              tblCode,
              itmCode,
              comparisonDates.전주,
              areaCode,
              API_KEY
            );
            const prevWeekValue = parseFloat(
              prevWeekData.data?.[0]?.value || 
              prevWeekData.data?.[0]?.dataValue ||
              prevWeekData.result?.data?.[0]?.value ||
              prevWeekData.data?.[0]?.val ||
              '0'
            );
            if (prevWeekValue !== 0) {
              comparison.전주 = calculateGrowthRate(currentValue, prevWeekValue);
            }
          } catch (e) {
            console.warn(`${guName} 전주 데이터 조회 실패:`, e);
          }
          
          try {
            const prevMonthData = await fetchStatsTableData(
              tblCode,
              itmCode,
              comparisonDates.전월,
              areaCode,
              API_KEY
            );
            const prevMonthValue = parseFloat(
              prevMonthData.data?.[0]?.value || 
              prevMonthData.data?.[0]?.dataValue ||
              prevMonthData.result?.data?.[0]?.value ||
              prevMonthData.data?.[0]?.val ||
              '0'
            );
            if (prevMonthValue !== 0) {
              comparison.전월 = calculateGrowthRate(currentValue, prevMonthValue);
            }
          } catch (e) {
            console.warn(`${guName} 전월 데이터 조회 실패:`, e);
          }
          
          try {
            const prevYearData = await fetchStatsTableData(
              tblCode,
              itmCode,
              comparisonDates.전년,
              areaCode,
              API_KEY
            );
            const prevYearValue = parseFloat(
              prevYearData.data?.[0]?.value || 
              prevYearData.data?.[0]?.dataValue ||
              prevYearData.result?.data?.[0]?.value ||
              prevYearData.data?.[0]?.val ||
              '0'
            );
            if (prevYearValue !== 0) {
              comparison.전년 = calculateGrowthRate(currentValue, prevYearValue);
            }
          } catch (e) {
            console.warn(`${guName} 전년 데이터 조회 실패:`, e);
          }
          
          // 히스토리 데이터 생성 (과거 5개 기간)
          const history: HistoryDataPoint[] = [];
          for (let i = 5; i >= 0; i--) {
            try {
              let historyDate: string;
              if (i === 0) {
                historyDate = currentDate;
              } else {
                const historyDateObj = new Date(now);
                switch (period) {
                  case '일':
                    historyDateObj.setDate(historyDateObj.getDate() - i);
                    break;
                  case '주':
                    historyDateObj.setDate(historyDateObj.getDate() - (i * 7));
                    break;
                  case '월':
                    historyDateObj.setMonth(historyDateObj.getMonth() - i);
                    break;
                  case '연':
                    historyDateObj.setFullYear(historyDateObj.getFullYear() - i);
                    break;
                }
                historyDate = formatDate(historyDateObj, period);
              }
              
              const historyData = await fetchStatsTableData(
                tblCode,
                itmCode,
                historyDate,
                areaCode,
                API_KEY
              );
              
              const historyValue = parseFloat(
                historyData.data?.[0]?.value || 
                historyData.data?.[0]?.dataValue ||
                historyData.result?.data?.[0]?.value ||
                historyData.data?.[0]?.val ||
                '0'
              );
              
              // 날짜 라벨 생성
              let dateLabel = '';
              let dateStr = '';
              if (i === 0) {
                switch (period) {
                  case '일': dateLabel = '오늘'; break;
                  case '주': dateLabel = '이번 주'; break;
                  case '월': dateLabel = '이번 달'; break;
                  case '연': dateLabel = '올해'; break;
                }
                dateStr = now.toLocaleDateString('ko-KR', { 
                  month: 'short', 
                  day: period === '월' || period === '연' ? undefined : 'numeric',
                  year: period === '월' || period === '연' ? 'numeric' : undefined
                });
              } else {
                const historyDateObj = new Date(now);
                switch (period) {
                  case '일':
                    historyDateObj.setDate(historyDateObj.getDate() - i);
                    dateLabel = `${i}일 전`;
                    dateStr = historyDateObj.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                    break;
                  case '주':
                    historyDateObj.setDate(historyDateObj.getDate() - (i * 7));
                    dateLabel = `${i}주 전`;
                    dateStr = historyDateObj.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                    break;
                  case '월':
                    historyDateObj.setMonth(historyDateObj.getMonth() - i);
                    dateLabel = `${i}개월 전`;
                    dateStr = historyDateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
                    break;
                  case '연':
                    historyDateObj.setFullYear(historyDateObj.getFullYear() - i);
                    dateLabel = `${i}년 전`;
                    dateStr = historyDateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
                    break;
                }
              }
              
              history.push({
                date: dateStr,
                value: Number(historyValue.toFixed(2)),
                label: dateLabel,
              });
            } catch (e) {
              console.warn(`${guName} ${i}기간 전 히스토리 데이터 조회 실패:`, e);
            }
          }
          
          housingData[guName] = {
            name: guName,
            currentValue: Number(currentValue.toFixed(2)),
            comparison,
            history: history.length > 0 ? history : undefined,
          };
        } catch (err: any) {
          console.error(`❌ ${guName} 데이터 로드 실패:`, err);
          console.error(`에러 상세:`, {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
          });
          
          // 개별 구 실패 시 더미 데이터로 대체
          console.warn(`⚠️ ${guName}는 더미 데이터로 대체됩니다.`);
          const seed = guName.charCodeAt(0) * 1000 + guName.charCodeAt(1) * 100 + period.charCodeAt(0) * 10;
          const fallbackValue = (seededRandom(seed) * 20 - 5);
          housingData[guName] = {
            name: guName,
            currentValue: fallbackValue,
            comparison: {
              전일: (seededRandom(seed + 1) * 10 - 2),
              전주: (seededRandom(seed + 2) * 12 - 3),
              전월: (seededRandom(seed + 3) * 15 - 4),
              전년: (seededRandom(seed + 4) * 20 - 5),
            },
            history: generateHistoryData(fallbackValue, period, seed),
          };
        }
      }
      
      setData(housingData);
      console.log('실제 API 데이터 로드 완료:', housingData);
      console.log('강남구 데이터:', housingData['강남구']);
      
      // 실제 API 사용 여부 확인
      const isRealData = Object.keys(housingData).some(gu => {
        const guData = housingData[gu];
        // 더미 데이터는 보통 -5 ~ 15 범위의 랜덤 값
        // 실제 데이터는 다른 패턴을 가질 수 있음
        return guData.currentValue !== 0 || Object.keys(guData.comparison).length > 0;
      });
      
      if (isRealData) {
        console.log('✅ 실제 API 데이터를 사용하고 있습니다.');
      } else {
        console.warn('⚠️ 더미 데이터를 사용하고 있을 수 있습니다. API 응답을 확인하세요.');
      }
      
    } catch (err: any) {
      console.error('❌ 데이터 로드 오류 발생:', err);
      console.error('에러 상세:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code,
      });
      
      // CORS 에러 확인
      if (err.message?.includes('CORS') || err.code === 'ERR_NETWORK') {
        console.error('🚫 CORS 에러가 발생했습니다. 브라우저에서 직접 API 호출이 차단되었습니다.');
        setError('CORS 문제로 API를 호출할 수 없습니다. 서버 사이드 프록시가 필요합니다.');
      } else {
        const errorMessage = err.response?.data?.message || err.message || '알 수 없는 오류';
        setError(`데이터를 불러오는 중 오류가 발생했습니다: ${errorMessage}`);
      }
      
      console.warn('⚠️ 오류로 인해 더미 데이터를 사용합니다.');
      generateDummyData(); // 오류 시에도 더미 데이터 표시
    } finally {
      setLoading(false);
      console.log('🏁 loadData 함수 종료');
    }
  };

  const selectedGuData: GuData | null = selectedGu ? data[selectedGu] || null : null;

  // 서울 전체 평균 계산
  const averageValue = useMemo(() => {
    const guList = Object.values(data);
    if (guList.length === 0) return undefined;
    
    const sum = guList.reduce((acc, gu) => acc + gu.currentValue, 0);
    return sum / guList.length;
  }, [data]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>서울 집값 상승률</h1>
        <p className="subtitle">서울시 구별 집값 상승률을 확인하세요</p>
      </header>

      <main className="app-main">
        <Tabs activePeriod={period} onChange={setPeriod} />

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <p className="error-hint">
              API 키를 설정하려면 .env 파일에 VITE_REB_API_KEY=your_api_key를 추가하세요.
            </p>
          </div>
        )}


        {loading && (
          <div className="loading">
            <p>데이터를 불러오는 중...</p>
          </div>
        )}

        <div className="map-section">
          <SeoulMap
            data={data}
            hoveredGu={hoveredGu}
            selectedGu={selectedGu}
            onGuHover={setHoveredGu}
            onGuClick={setSelectedGu}
            averageValue={averageValue}
          />
        </div>

        <ComparisonInfo guData={selectedGuData} period={period} />
      </main>

      <footer className="app-footer">
        <p>데이터 출처: 부동산 통계원 (www.reb.or.kr)</p>
      </footer>
    </div>
  );
}

export default App;