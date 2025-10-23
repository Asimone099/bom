// Configurazione Google OAuth
export const GOOGLE_OAUTH_CONFIG = {
  // Client ID Google OAuth (da sostituire con quello reale)
  clientId: 'your-google-client-id.apps.googleusercontent.com',
  
  // Redirect URI
  redirectUri: window.location.origin + '/auth/callback',
  
  // Scopes richiesti
  scopes: [
    'openid',
    'profile',
    'email'
  ],
  
  // URL di autorizzazione Google
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  
  // URL per ottenere il token
  tokenUrl: 'https://oauth2.googleapis.com/token'
};

// Funzione per generare l'URL di autorizzazione Google
export const generateGoogleAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `${GOOGLE_OAUTH_CONFIG.authUrl}?${params.toString()}`;
};

// Funzione per aprire popup di login Google
export const openGoogleLoginPopup = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const authUrl = generateGoogleAuthUrl();
    const popup = window.open(
      authUrl,
      'google-login',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      reject(new Error('Popup bloccato dal browser'));
      return;
    }
    
    // Monitora il popup per il codice di autorizzazione
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        reject(new Error('Login annullato dall\'utente'));
      }
      
      try {
        if (popup.location.href.includes('/auth/callback')) {
          const url = new URL(popup.location.href);
          const code = url.searchParams.get('code');
          
          if (code) {
            popup.close();
            clearInterval(checkClosed);
            resolve(code);
          }
        }
      } catch (error) {
        // Errore di cross-origin, normale durante il processo
      }
    }, 1000);
  });
};