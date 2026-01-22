# 프로덕션 배포 가이드 (서버 없이)

이 프로젝트는 **서버 없이** 정적 호스팅으로 배포할 수 있습니다.

## 배포 방법

### 1. 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

### 2. 정적 호스팅 서비스에 배포

다음 서비스 중 하나를 선택하여 배포할 수 있습니다:

#### GitHub Pages

1. GitHub 저장소 생성
2. `dist` 폴더의 내용을 저장소에 푸시
3. GitHub Pages 설정에서 `dist` 폴더를 소스로 선택

또는 GitHub Actions를 사용하여 자동 배포:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### Netlify

1. [Netlify](https://www.netlify.com/)에 가입
2. "Add new site" → "Deploy manually"
3. `dist` 폴더를 드래그 앤 드롭
4. 또는 GitHub 저장소 연결 후 자동 배포

#### Vercel

1. [Vercel](https://vercel.com/)에 가입
2. GitHub 저장소 연결
3. 빌드 설정:
   - Build Command: `npm run build`
   - Output Directory: `dist`

#### Cloudflare Pages

1. [Cloudflare Pages](https://pages.cloudflare.com/)에 가입
2. GitHub 저장소 연결
3. 빌드 설정:
   - Build command: `npm run build`
   - Build output directory: `dist`

## CORS 문제 해결

부동산 통계원 API가 CORS를 허용하지 않을 경우, 다음 방법을 사용할 수 있습니다:

### 방법 1: CORS 프록시 서비스 사용 (개발용)

`.env` 파일에 CORS 프록시 URL 추가:

```env
VITE_CORS_PROXY=https://cors-anywhere.herokuapp.com/
```

⚠️ **주의**: 공개 CORS 프록시는 프로덕션에서 사용하지 마세요. 속도가 느리고 안정성이 보장되지 않습니다.

### 방법 2: 서버리스 함수 사용 (권장)

Netlify Functions 또는 Vercel Functions를 사용하여 프록시 API 생성:

**Netlify Functions 예시** (`netlify/functions/proxy.ts`):

```typescript
import { Handler } from '@netlify/functions';
import axios from 'axios';

export const handler: Handler = async (event) => {
  const { queryStringParameters } = event;
  const apiUrl = `https://www.reb.or.kr/r-one/openapi/${queryStringParameters?.path}`;
  
  try {
    const response = await axios.get(apiUrl, {
      params: queryStringParameters,
    });
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API 호출 실패' }),
    };
  }
};
```

### 방법 3: API가 CORS를 허용하는지 확인

부동산 통계원 API가 CORS를 허용한다면 추가 설정 없이 사용 가능합니다.

## 환경 변수 설정

정적 호스팅 서비스에서 환경 변수 설정:

- **Netlify**: Site settings → Environment variables
- **Vercel**: Project settings → Environment Variables
- **GitHub Pages**: GitHub Actions secrets 사용

`.env.production` 파일 생성 (빌드 시 자동 사용):

```env
VITE_REB_API_KEY=your_production_api_key
```

## 배포 체크리스트

- [ ] `npm run build` 성공 확인
- [ ] `dist` 폴더에 모든 파일 생성 확인
- [ ] 환경 변수 설정 확인
- [ ] CORS 문제 해결 (필요한 경우)
- [ ] 배포 후 실제 동작 확인

## 참고

- 정적 호스팅은 서버 없이 HTML, CSS, JavaScript 파일만 제공합니다
- API 호출은 브라우저에서 직접 이루어지므로 CORS 정책을 준수해야 합니다
- API 키는 클라이언트에 노출되므로, 공개 API 키만 사용하세요