import cors from 'cors';

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://thriving-bubblegum-3ba9d9.netlify.app' // Il tuo frontend Netlify
    ];
    
    // In production, allow additional domains
    if (process.env.NODE_ENV === 'production') {
      // Allow any Netlify domain for flexibility
      if (origin && origin.includes('.netlify.app')) {
        allowedOrigins.push(origin);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ]
};

export default cors(corsOptions);