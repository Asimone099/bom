import React, { useEffect } from 'react';
import { Spin, Typography } from 'antd';

const { Title, Text } = Typography;

const GoogleCallback: React.FC = () => {
  useEffect(() => {
    // Questa pagina viene caricata nel popup di Google OAuth
    // Il codice di autorizzazione viene estratto dall'URL dal servizio di autenticazione
    
    // Mostra un messaggio di caricamento mentre il popup viene processato
    const timer = setTimeout(() => {
      // Se il popup non si chiude automaticamente, mostra un messaggio
      document.body.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h2 style="color: #52c41a; margin-bottom: 8px;">Autenticazione completata!</h2>
            <p style="color: #666; margin-bottom: 16px;">Puoi chiudere questa finestra.</p>
            <button 
              onclick="window.close()" 
              style="
                background: #1890ff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              "
            >
              Chiudi finestra
            </button>
          </div>
        </div>
      `;
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      }}>
        <Spin size="large" style={{ marginBottom: '16px' }} />
        <Title level={3} style={{ margin: '16px 0 8px', color: '#1890ff' }}>
          Completamento autenticazione...
        </Title>
        <Text type="secondary">
          Elaborazione dei dati di Google in corso
        </Text>
      </div>
    </div>
  );
};

export default GoogleCallback;