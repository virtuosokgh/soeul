import React from 'react';
import type { PeriodType } from '../types';
import './Tabs.css';

interface TabsProps {
  activePeriod: PeriodType;
  onChange: (period: PeriodType) => void;
}

const PERIODS: PeriodType[] = ['일', '주', '월', '연'];

function Tabs({ activePeriod, onChange }: TabsProps) {
  return (
    <div className="tabs-container">
      <div className="tabs">
        {PERIODS.map((period) => (
          <button
            key={period}
            className={`tab-button ${activePeriod === period ? 'active' : ''}`}
            onClick={() => onChange(period)}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  );
}

// React.memo로 최적화
export default React.memo(Tabs);