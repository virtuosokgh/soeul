import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path, ...params } = req.query;
  
  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'path parameter is required' });
    return;
  }

  try {
    const apiUrl = `https://www.reb.or.kr/r-one/openapi/${path}`;
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const fullUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl;
    
    console.log('Proxying request to:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
      },
    });
    
    if (!response.ok) {
      res.status(response.status).json({ 
        error: 'API request failed', 
        status: response.status 
      });
      return;
    }
    
    const data = await response.text();
    
    // 응답을 그대로 반환 (문자열)
    res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(data);
  } catch (error: any) {
    console.error('API 호출 실패:', error);
    res.status(500).json({ 
      error: 'API 호출 실패', 
      message: error.message 
    });
  }
}