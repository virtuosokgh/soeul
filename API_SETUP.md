# 실제 API 데이터 사용 가이드

현재는 더미 데이터를 사용하고 있습니다. 실제 부동산 통계원 API를 사용하려면 다음 단계를 따라주세요.

## 1. API 키 발급

1. 부동산 통계원 Open API 사이트 접속: https://www.reb.or.kr/r-one/portal/openapi/openApiDevPage.do
2. 회원가입 및 로그인
3. API 키 발급 신청
4. 발급받은 API 키를 `.env` 파일에 추가:

```env
VITE_REB_API_KEY=your_api_key_here
```

## 2. 통계표 및 항목 코드 확인

부동산 통계원 API를 사용하려면 다음 정보가 필요합니다:

1. **통계표 코드 (tblCode)**: 집값 상승률 관련 통계표 코드
2. **통계항목 코드 (itmCode)**: 구별 집값 상승률 항목 코드
3. **지역 코드 (areaCode)**: 각 구별 지역 코드

### 통계표 코드 확인 방법

```javascript
// 브라우저 콘솔에서 실행하거나 API 테스트 도구 사용
const response = await fetch('https://www.reb.or.kr/r-one/openapi/SttsApiTbl.do?key=YOUR_API_KEY&type=json');
const data = await response.json();
console.log('통계표 목록:', data);
```

집값 관련 통계표를 찾아서 `tblCode`를 확인하세요.

### 통계항목 코드 확인 방법

```javascript
const tblCode = '확인한_통계표_코드';
const response = await fetch(`https://www.reb.or.kr/r-one/openapi/SttsApiTblItm.do?key=YOUR_API_KEY&tblCode=${tblCode}&type=json`);
const data = await response.json();
console.log('통계항목 목록:', data);
```

구별 집값 상승률 항목을 찾아서 `itmCode`를 확인하세요.

## 3. 코드 수정

`src/App.tsx`의 `loadData` 함수에서 주석 처리된 부분을 활성화하고 실제 코드로 수정하세요:

```typescript
const tblCode = '실제_확인한_통계표_코드';
const itmCode = '실제_확인한_항목_코드';
```

## 4. CORS 문제 해결

부동산 통계원 API가 CORS를 허용하지 않을 경우:

### 방법 1: Vercel Functions 사용 (권장)

`api/proxy.ts` 파일 생성:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, ...params } = req.query;
  
  try {
    const apiUrl = `https://www.reb.or.kr/r-one/openapi/${url}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'API 호출 실패' });
  }
}
```

그리고 `src/services/api.ts`에서 프록시 사용:

```typescript
const API_BASE = '/api/proxy?url=';
```

### 방법 2: 환경변수로 CORS 프록시 설정

`.env` 파일에 추가:

```env
VITE_CORS_PROXY=https://your-cors-proxy.com/
```

## 5. 테스트

1. API 키 설정 후 개발 서버 재시작
2. 브라우저 콘솔에서 API 호출 확인
3. 데이터가 정상적으로 로드되는지 확인

## 참고

- 부동산 통계원 API 문서: https://www.reb.or.kr/r-one/portal/openapi/openApiGuideCdPage.do
- API 호출 제한이 있을 수 있으니 주의하세요
- 실제 통계표/항목 코드는 API 문서나 담당자에게 문의하세요