// 서울시 구 단위 GeoJSON 데이터
// 실제 사용 시에는 공공데이터 포털에서 다운로드한 GeoJSON을 사용하거나
// SVG 지도를 사용할 수 있습니다.
// 여기서는 간단한 예시 데이터 구조를 제공합니다.

export const seoulGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "강남구", code: "11680" },
      geometry: {
        type: "Polygon",
        coordinates: [[[127.0, 37.5], [127.1, 37.5], [127.1, 37.6], [127.0, 37.6], [127.0, 37.5]]]
      }
    },
    // 실제로는 모든 구의 정확한 좌표가 필요합니다
    // 공공데이터 포털에서 서울시 행정구역 경계 GeoJSON을 다운로드하여 사용하세요
  ]
};

// 실제 프로덕션에서는 외부 GeoJSON 파일을 로드하거나
// 공공데이터 포털 API를 사용하는 것이 좋습니다.