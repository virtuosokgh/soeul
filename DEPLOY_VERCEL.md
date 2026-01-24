# 🚀 Vercel Functions로 서버 없이 배포하기

## ✅ 완료된 설정

이 프로젝트는 **서버를 직접 운영하지 않고도** Vercel Functions를 통해 API를 호출할 수 있도록 설정되어 있습니다.

## 📋 배포 방법 (5분 소요)

### 1단계: GitHub에 코드 푸시

```bash
git add .
git commit -m "Vercel Functions 배포 준비"
git push origin main
```

### 2단계: Vercel에 배포

1. **Vercel 접속**: https://vercel.com
2. **회원가입/로그인**: GitHub 계정으로 로그인
3. **프로젝트 추가**: "Add New Project" 클릭
4. **저장소 선택**: GitHub 저장소 선택
5. **배포 설정**:
   - Framework Preset: **Vite** 선택
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build` (자동 감지됨)
   - Output Directory: `dist` (자동 감지됨)
6. **환경 변수 추가**:
   - Key: `VITE_REB_API_KEY`
   - Value: `72b2df13552345c5b1cba5e4d7c7b6b9`
7. **Deploy** 클릭

### 3단계: 배포 완료 확인

- 배포 완료 후 제공되는 URL로 접속
- 예: `https://your-project.vercel.app`
- API 호출이 정상적으로 작동하는지 확인

## 🔧 작동 원리

### 프로덕션 (Vercel 배포)
```
브라우저 → /api/proxy → Vercel Functions → 부동산 통계원 API
```
- Vercel Functions가 서버 역할을 하여 CORS 문제 해결
- 서버를 직접 운영할 필요 없음

### 로컬 개발
```
브라우저 → /api/proxy → Vite 프록시 → 부동산 통계원 API
```
- Vite 개발 서버의 프록시 기능 사용
- `npm run dev` 실행 시 자동으로 프록시 작동

## 📁 주요 파일

- **`api/proxy.ts`**: Vercel Functions 서버리스 함수
- **`vercel.json`**: Vercel 배포 설정
- **`vite.config.ts`**: 로컬 개발용 프록시 설정

## 🎯 장점

✅ **서버 직접 운영 불필요**: Vercel이 자동으로 서버리스 함수 호스팅  
✅ **무료**: 개인 프로젝트는 무료 플랜으로 충분  
✅ **자동 배포**: GitHub에 푸시하면 자동으로 재배포  
✅ **CORS 해결**: 서버리스 함수가 프록시 역할  
✅ **빠른 속도**: CDN으로 전 세계 어디서나 빠른 속도  
✅ **간단한 설정**: 이미 모든 설정 완료

## 🔄 자동 배포

GitHub에 푸시하면 자동으로 Vercel이 재배포합니다:
```bash
git push origin main
```

## 📝 환경 변수 관리

Vercel 대시보드에서 환경 변수를 관리할 수 있습니다:
1. 프로젝트 → Settings → Environment Variables
2. `VITE_REB_API_KEY` 추가/수정
3. "Redeploy" 클릭하여 재배포

## 🐛 문제 해결

### API 호출이 안 될 때
1. Vercel 대시보드에서 Functions 로그 확인
2. 환경 변수 `VITE_REB_API_KEY`가 설정되어 있는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 로컬에서 테스트하고 싶을 때
```bash
npm run dev
```
로컬 개발 서버가 Vite 프록시를 사용하여 작동합니다.