import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 상대 경로로 빌드하여 정적 호스팅에 최적화
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://www.reb.or.kr',
        changeOrigin: true,
        secure: true,
        // rewrite를 사용하지 않고 configure에서만 처리
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            try {
              // req.url에서 쿼리 파라미터 추출
              // req.url 형식: /api/proxy?path=SttsApiTbl.do&key=...&type=...
              const url = new URL(req.url || '', 'http://localhost:5173');
              const apiPath = url.searchParams.get('path');
              
              console.log('🔍 원본 req.url:', req.url);
              console.log('🔍 추출된 apiPath:', apiPath);
              
              if (apiPath) {
                // path를 제외한 모든 파라미터 수집
                const params = new URLSearchParams();
                url.searchParams.forEach((value, key) => {
                  if (key !== 'path') {
                    params.append(key, value);
                    console.log(`  📋 파라미터: ${key} = ${value}`);
                  }
                });
                
                const queryString = params.toString();
                const finalPath = `/r-one/openapi/${apiPath}${queryString ? '?' + queryString : ''}`;
                
                // path와 query string 설정
                proxyReq.path = finalPath;
                proxyReq.setHeader('host', 'www.reb.or.kr');
                proxyReq.setHeader('accept', 'application/json, application/xml, text/xml');
                
                console.log('✅ 최종 프록시 요청 URL:', finalPath);
                console.log('✅ 전달되는 파라미터 개수:', params.toString().split('&').length);
              } else {
                console.error('❌ 프록시: path 파라미터가 없습니다.');
                console.error('❌ req.url:', req.url);
                console.error('❌ url.searchParams:', Array.from(url.searchParams.entries()));
              }
            } catch (error) {
              console.error('❌ 프록시 설정 오류:', error);
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📥 프록시 응답 상태:', proxyRes.statusCode);
            console.log('📥 요청 URL:', req.url);
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('❌ 프록시 에러:', err.message);
            console.error('❌ 요청 URL:', req.url);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})