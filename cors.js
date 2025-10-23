// CORS utility for Vercel functions
export function setCorsHeaders(res) {
  const allowedOrigins = [
    'https://thriving-bubblegum-3ba9d9.netlify.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(', '));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export function handleCors(req, res, handler) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  return handler(req, res);
}

export function createApiHandler(handler) {
  return async (req, res) => {
    return handleCors(req, res, handler);
  };
}