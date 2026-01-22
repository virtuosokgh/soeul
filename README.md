# 서울 집값 상승률 시각화

서울시 구별 집값 상승률을 지도로 시각화하는 웹 애플리케이션입니다.

## 기능

- 🗺️ 서울시 구 단위 지도 표시
- 🖱️ 마우스 오버/터치 시 구별 하이라이트
- 📊 일/주/월/연 단위 데이터 표시
- 📈 전일/전주/전월/전년 대비 상승률 비교

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. API 키 설정

부동산 통계원에서 API 키를 발급받은 후, `.env` 파일을 생성하고 다음을 추가하세요:

```env
VITE_REB_API_KEY=your_api_key_here
```

API 키 발급: https://www.reb.or.kr/r-one/portal/openapi/openApiDevPage.do

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 빌드

```bash
npm run build
```

## 기술 스택

- React 18
- TypeScript
- Vite
- Leaflet (지도)
- React Leaflet
- Axios (API 호출)

## API 사용

이 프로젝트는 부동산 통계원의 다음 API를 사용합니다:

- `SttsApiTbl.do`: 통계표 목록 조회
- `SttsApiTblItm.do`: 통계항목 목록 조회
- `SttsApiTblData.do`: 통계 데이터 조회

## 프로덕션 배포 (서버 없이)

이 프로젝트는 **서버 없이** 정적 호스팅으로 배포할 수 있습니다.

### 빠른 배포

```bash
# 1. 빌드
npm run build

# 2. dist 폴더를 정적 호스팅 서비스에 업로드
# - GitHub Pages
# - Netlify
# - Vercel
# - Cloudflare Pages
```

자세한 배포 가이드는 [deploy.md](./deploy.md)를 참고하세요.

### CORS 문제 해결

부동산 통계원 API가 CORS를 허용하지 않을 경우:
- 서버리스 함수 사용 (Netlify Functions, Vercel Functions) - 권장
- 또는 API가 CORS를 허용하는지 확인

## 주의사항

- 현재는 더미 데이터를 사용하고 있습니다. 실제 API 통합을 위해서는 부동산 통계원의 API 문서를 참고하여 통계표 코드와 항목 코드를 확인해야 합니다.
- 서울시 구 경계 GeoJSON 데이터는 공공데이터 포털에서 다운로드하여 사용하거나, GitHub의 seoul-maps 저장소를 활용할 수 있습니다.
- **서버 없이 배포 가능**: 정적 호스팅 서비스(GitHub Pages, Netlify, Vercel 등)에 바로 배포할 수 있습니다.

## 라이선스

MIT