import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { GuData } from '../types';
import './ComparisonInfo.css';

interface ComparisonInfoProps {
  guData: GuData | null;
  period: string;
}

export default function ComparisonInfo({ guData, period }: ComparisonInfoProps) {
  if (!guData) {
    return (
      <div className="comparison-info">
        <p className="info-placeholder">지도에서 구를 선택하거나 마우스를 올려보세요</p>
      </div>
    );
  }

  const { name, currentValue, comparison, history } = guData;

  // 그래프 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{data.label}</p>
          <p className={`tooltip-value ${data.value >= 0 ? 'positive' : 'negative'}`}>
            {data.value >= 0 ? '+' : ''}{data.value.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="comparison-info">
      <h2 className="gu-name">{name}</h2>
      <div className="current-value">
        <span className="label">현재 {period} 상승률</span>
        <span className={`value ${currentValue >= 0 ? 'positive' : 'negative'}`}>
          {currentValue >= 0 ? '+' : ''}{currentValue.toFixed(2)}%
        </span>
      </div>
      
      {/* 히스토리 그래프 */}
      {history && history.length > 0 && (
        <div className="history-chart">
          <h3>최근 5개 기간 추이</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: '상승률 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#999" strokeDasharray="2 2" />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor}
                strokeWidth={2}
                dot={{ fill: chartColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="comparison-list">
        <h3>비교</h3>
        <div className="comparison-items">
          {comparison.전일 !== undefined && (
            <div className="comparison-item">
              <span className="comparison-label">전일 대비</span>
              <span className={`comparison-value ${comparison.전일 >= 0 ? 'positive' : 'negative'}`}>
                {comparison.전일 >= 0 ? '+' : ''}{comparison.전일.toFixed(2)}%
              </span>
            </div>
          )}
          {comparison.전주 !== undefined && (
            <div className="comparison-item">
              <span className="comparison-label">전주 대비</span>
              <span className={`comparison-value ${comparison.전주 >= 0 ? 'positive' : 'negative'}`}>
                {comparison.전주 >= 0 ? '+' : ''}{comparison.전주.toFixed(2)}%
              </span>
            </div>
          )}
          {comparison.전월 !== undefined && (
            <div className="comparison-item">
              <span className="comparison-label">전월 대비</span>
              <span className={`comparison-value ${comparison.전월 >= 0 ? 'positive' : 'negative'}`}>
                {comparison.전월 >= 0 ? '+' : ''}{comparison.전월.toFixed(2)}%
              </span>
            </div>
          )}
          {comparison.전년 !== undefined && (
            <div className="comparison-item">
              <span className="comparison-label">전년 대비</span>
              <span className={`comparison-value ${comparison.전년 >= 0 ? 'positive' : 'negative'}`}>
                {comparison.전년 >= 0 ? '+' : ''}{comparison.전년.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// React.memo로 최적화
export default React.memo(ComparisonInfo);