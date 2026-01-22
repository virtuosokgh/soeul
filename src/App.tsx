import { useState, useEffect, useCallback, useMemo } from 'react';
import SeoulMap from './components/SeoulMap';
import Tabs from './components/Tabs';
import ComparisonInfo from './components/ComparisonInfo';
import type { PeriodType, HousingPriceData, GuData, ComparisonData, HistoryDataPoint } from './types';
import { SEOUL_GU_LIST } from './services/api';
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
    if (!API_KEY) {
      // API 키가 없어도 더미 데이터로 동작하므로 에러가 아닌 정보 메시지로 변경
      setError(null);
      // 개발용 더미 데이터 생성
      generateDummyData();
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // 실제 API에서 데이터 로드
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 실제 API 호출 로직
      // 여기서는 예시로 더미 데이터를 사용합니다
      // 실제 사용 시에는 부동산 통계원 API를 호출하여 데이터를 가져와야 합니다
      
      // TODO: 실제 API 통합
      // 1. 통계표 코드 확인 (SttsApiTbl.do)
      // 2. 통계항목 코드 확인 (SttsApiTblItm.do)
      // 3. 각 구별 데이터 조회 (SttsApiTblData.do)
      // 4. 비교 기간 데이터 조회 및 상승률 계산

      // CORS 문제가 있을 수 있으므로, 일단 더미 데이터 사용
      // 실제 API를 사용하려면 CORS 프록시 설정이 필요할 수 있습니다
      generateDummyData();
      
    } catch (err) {
      console.error('데이터 로드 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다. CORS 문제일 수 있습니다.');
      generateDummyData(); // 오류 시에도 더미 데이터 표시
    } finally {
      setLoading(false);
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

        {!API_KEY && (
          <div className="info-message">
            <p>💡 현재 더미 데이터를 사용 중입니다. 실제 API를 사용하려면 .env 파일에 VITE_REB_API_KEY를 설정하세요.</p>
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