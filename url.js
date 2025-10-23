// Google OAuth URL endpoint
import { createApiHandler } from '../../../lib/cors.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: 'Google OAuth non configurato',
        message: 'Configurare GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI nelle variabili ambiente',
        setupGuide: 'Vedere CONFIGURAZIONE-GOOGLE-OAUTH.md per i dettagli'
      });
    }

    const scope = 'openid profile email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    res.status(200).json({ authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

export default createApiHandler(handler);