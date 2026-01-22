import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { HousingPriceData } from '../types';
import './SeoulMap.css';

// Leaflet 기본 아이콘 설정
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface SeoulMapProps {
  data: HousingPriceData;
  hoveredGu: string | null;
  selectedGu: string | null;
  onGuHover: (guName: string | null) => void;
  onGuClick?: (guName: string) => void;
}

// 서울시 중심 좌표
const SEOUL_CENTER: [number, number] = [37.5665, 126.9780];

// 서울시 경계 (북위, 동경)
const SEOUL_BOUNDS: [[number, number], [number, number]] = [
  [37.413, 126.734], // 남서쪽 (최소 위도, 최소 경도)
  [37.701, 127.183], // 북동쪽 (최대 위도, 최대 경도)
];

// 색상 스케일 함수
function getColor(value: number): string {
  if (value === 0 || isNaN(value)) return '#CCCCCC';
  
  // 상승률에 따른 색상
  if (value > 10) return '#800026';
  if (value > 5) return '#BD0026';
  if (value > 2) return '#E31A1C';
  if (value > 0) return '#FC4E2A';
  if (value > -2) return '#FEB24C';
  if (value > -5) return '#FED976';
  if (value > -10) return '#FFEDA0';
  return '#1F78B4';
}

// GeoJSON 스타일 함수
function getStyle(feature: any, data: HousingPriceData, hoveredGu: string | null, selectedGu: string | null) {
  const guName = feature.properties.name || feature.properties.SIG_KOR_NM;
  const guData = data[guName];
  const value = guData?.currentValue || 0;
  const isHovered = hoveredGu === guName;
  const isSelected = selectedGu === guName;

  return {
    fillColor: getColor(value),
    weight: (isHovered || isSelected) ? 4 : 2,
    opacity: 1,
    color: (isHovered || isSelected) ? '#333' : '#fff',
    fillOpacity: (isHovered || isSelected) ? 0.9 : 0.7,
    dashArray: (isHovered || isSelected) ? '5, 5' : undefined,
  };
}

// 다각형의 중심점 계산
function getCentroid(coords: any[]): [number, number] {
  if (coords.length === 0) return [0, 0];
  
  // 첫 번째 좌표 배열 사용 (다각형의 외곽선)
  const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
  
  let latSum = 0;
  let lngSum = 0;
  let count = 0;
  
  ring.forEach((coord: any) => {
    if (Array.isArray(coord[0])) {
      // 중첩된 배열인 경우
      coord.forEach((c: any) => {
        if (Array.isArray(c) && c.length >= 2) {
          latSum += c[1];
          lngSum += c[0];
          count++;
        }
      });
    } else if (Array.isArray(coord) && coord.length >= 2) {
      latSum += coord[1];
      lngSum += coord[0];
      count++;
    }
  });
  
  return count > 0 ? [latSum / count, lngSum / count] : [0, 0];
}

// 텍스트 레이블 아이콘 생성
function createLabelIcon(text: string, value: number, isHovered: boolean): L.DivIcon {
  const color = value >= 0 ? '#e31a1c' : '#1f78b4';
  const bgColor = isHovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)';
  const borderColor = isHovered ? '#333' : '#666';
  
  return L.divIcon({
    html: `
      <div style="
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 600;
        color: ${color};
        text-align: center;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        pointer-events: none;
      ">
        ${text}
      </div>
    `,
    className: 'gu-label',
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  });
}

// GeoJSON 이벤트 핸들러
function GeoJsonLayer({ data, hoveredGu, selectedGu, onGuHover, onGuClick }: SeoulMapProps) {
  const [labels, setLabels] = useState<Array<{ guName: string; position: [number, number]; value: number }>>([]);

  // onEachFeature를 useCallback으로 감싸서 렌더링 중 상태 업데이트 문제 해결
  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    const guName = feature.properties.name || feature.properties.SIG_KOR_NM || feature.properties.SIG_ENG_NM;
    
    // 툴팁 추가
    const guData = data[guName];
    const value = guData?.currentValue || 0;
    const tooltipContent = `
      <div style="text-align: center; padding: 5px;">
        <strong>${guName}</strong><br/>
        상승률: ${value.toFixed(2)}%
      </div>
    `;
    
    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      className: 'custom-tooltip'
    });

    // 마우스 이벤트 - setTimeout으로 비동기 처리하여 렌더링 사이클과 분리
    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        targetLayer.setStyle({
          weight: 4,
          color: '#333',
          fillOpacity: 0.9,
          dashArray: '5, 5'
        });
        // 비동기로 상태 업데이트하여 렌더링 사이클과 분리
        setTimeout(() => {
          onGuHover(guName);
        }, 0);
        targetLayer.openTooltip();
      },
      mouseout: (e) => {
        const targetLayer = e.target;
        const isSelected = selectedGu === guName;
        // 선택된 구는 하이라이트 유지
        targetLayer.setStyle({
          weight: isSelected ? 4 : 2,
          color: isSelected ? '#333' : '#fff',
          fillOpacity: isSelected ? 0.9 : 0.7,
          dashArray: isSelected ? '5, 5' : undefined
        });
        setTimeout(() => {
          onGuHover(null);
        }, 0);
        targetLayer.closeTooltip();
      },
      click: () => {
        if (onGuClick) {
          // 클릭 시 선택된 구 변경 (상세 정보 표시)
          onGuClick(guName);
        }
      }
    });
  }, [data, hoveredGu, selectedGu, onGuHover, onGuClick]);

  // GeoJSON 데이터 로드 (실제로는 외부 파일이나 API에서 가져와야 함)
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [geoJsonLoading, setGeoJsonLoading] = useState(true);

  useEffect(() => {
    // 실제 프로덕션에서는 공공데이터 포털에서 GeoJSON을 로드하세요
    // 예: fetch('/data/seoul-districts.geojson').then(r => r.json()).then(setGeoJsonData)
    
    const loadGeoJson = async () => {
      setGeoJsonLoading(true);
      try {
        // 여러 소스에서 시도
        const sources = [
          'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_geo_simple.json',
          'https://raw.githubusercontent.com/southkorea/seoul-maps/master/geojson/seoul_municipalities_geo_simple.json',
        ];

        let loaded = false;
        for (const url of sources) {
          try {
            const response = await fetch(url, { 
              mode: 'cors',
              cache: 'no-cache'
            });
            if (response.ok) {
              const data = await response.json();
              if (data && data.features && data.features.length > 0) {
                setGeoJsonData(data);
                loaded = true;
                console.log('GeoJSON 로드 성공:', url);
                break;
              }
            }
          } catch (e) {
            console.warn('GeoJSON 소스 실패:', url, e);
            continue;
          }
        }

        if (!loaded) {
          console.warn('모든 GeoJSON 소스 실패, 기본 지도만 표시');
          setGeoJsonData(null);
        }
      } catch (error) {
        console.error('GeoJSON 로드 오류:', error);
        setGeoJsonData(null);
      } finally {
        setGeoJsonLoading(false);
      }
    };

    loadGeoJson();
  }, []);

  // GeoJSON이 로드되면 레이블 업데이트
  useEffect(() => {
    if (geoJsonData && geoJsonData.features) {
      const newLabels: Array<{ guName: string; position: [number, number]; value: number }> = [];
      geoJsonData.features.forEach((feature: any) => {
        const guName = feature.properties.name || feature.properties.SIG_KOR_NM || feature.properties.SIG_ENG_NM;
        const guData = data[guName];
        const value = guData?.currentValue || 0;
        
        if (feature.geometry && feature.geometry.coordinates) {
          const centroid = getCentroid(feature.geometry.coordinates);
          if (centroid[0] !== 0 && centroid[1] !== 0) {
            newLabels.push({ guName, position: centroid, value });
          }
        }
      });
      setLabels(newLabels);
    }
  }, [geoJsonData, data]);

  // 레이블을 useMemo로 최적화 (항상 호출되어야 함 - Hooks 규칙)
  const labelMarkers = useMemo(() => {
    return labels.map((label) => {
      const isHovered = hoveredGu === label.guName;
      const isSelected = selectedGu === label.guName;
      const labelText = `${label.value >= 0 ? '+' : ''}${label.value.toFixed(1)}%`;
      const icon = createLabelIcon(labelText, label.value, isHovered || isSelected);
      
      return (
        <Marker
          key={`${label.guName}-${isHovered || isSelected ? 'highlighted' : 'normal'}`}
          position={label.position}
          icon={icon}
          interactive={false}
          zIndexOffset={1000}
        />
      );
    });
  }, [labels, hoveredGu, selectedGu]);

  // GeoJSON 로딩 중일 때
  if (geoJsonLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#666'
      }}>
        지도를 불러오는 중...
      </div>
    );
  }

  return (
    <>
      {geoJsonData && (
        <GeoJSON
          data={geoJsonData}
          style={(feature) => getStyle(feature, data, hoveredGu, selectedGu)}
          onEachFeature={onEachFeature}
        />
      )}
      {/* 각 구에 상승률 레이블 표시 */}
      {labelMarkers}
    </>
  );
}

function SeoulMap({ data, hoveredGu, selectedGu, onGuHover, onGuClick }: SeoulMapProps) {
  return (
    <div className="seoul-map-container">
      <MapContainer
        center={SEOUL_CENTER}
        zoom={11}
        minZoom={11}
        maxZoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        maxBounds={SEOUL_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJsonLayer
          data={data}
          hoveredGu={hoveredGu}
          selectedGu={selectedGu}
          onGuHover={onGuHover}
          onGuClick={onGuClick}
        />
      </MapContainer>
    </div>
  );
}

// React.memo로 최적화
export default React.memo(SeoulMap);