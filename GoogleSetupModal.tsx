import React from 'react';
import { Modal, Typography, Steps, Button, Alert } from 'antd';
import { GoogleOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface GoogleSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

const GoogleSetupModal: React.FC<GoogleSetupModalProps> = ({ visible, onClose }) => {
  const steps = [
    {
      title: 'Google Cloud Console',
      description: 'Crea progetto e abilita API',
      icon: <GoogleOutlined />,
    },
    {
      title: 'Credenziali OAuth',
      description: 'Configura Client ID e Secret',
      icon: <SettingOutlined />,
    },
    {
      title: 'Aggiorna .env',
      description: 'Inserisci credenziali nel backend',
      icon: <CheckCircleOutlined />,
    },
  ];

  const openGoogleConsole = () => {
    window.open('https://console.cloud.google.com/', '_blank');
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GoogleOutlined style={{ color: '#db4437' }} />
          <span>Setup Google OAuth (5 minuti)</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="console" type="primary" icon={<GoogleOutlined />} onClick={openGoogleConsole}>
          Apri Google Console
        </Button>,
        <Button key="close" onClick={onClose}>
          Chiudi
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        <Alert
          message="Google OAuth non configurato"
          description="Configura Google OAuth per abilitare il login con account Google reali. Ci vogliono solo 5 minuti!"
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Steps
          direction="vertical"
          size="small"
          items={steps}
          style={{ marginBottom: '24px' }}
        />

        <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <Title level={5}>🚀 Setup Rapido:</Title>
          
          <Paragraph>
            <Text strong>1. Google Cloud Console</Text>
            <br />
            • Vai su <Text code>console.cloud.google.com</Text>
            <br />
            • Crea nuovo progetto "BOM Management System"
            <br />
            • Abilita "Google+ API" o "People API"
          </Paragraph>

          <Paragraph>
            <Text strong>2. Credenziali OAuth</Text>
            <br />
            • Vai su "APIs & Services" → "Credentials"
            <br />
            • Crea "OAuth 2.0 Client ID" (Web application)
            <br />
            • Authorized origins: <Text code>http://localhost:3000</Text>
            <br />
            • Redirect URIs: <Text code>http://localhost:3000/auth/callback</Text>
          </Paragraph>

          <Paragraph>
            <Text strong>3. Aggiorna backend/.env</Text>
            <br />
            • Copia Client ID e Secret da Google Console
            <br />
            • Incolla in <Text code>backend/.env</Text>:
            <br />
            <Text code style={{ display: 'block', marginTop: '8px', padding: '8px', background: 'white' }}>
              GOOGLE_CLIENT_ID=tuo-client-id.apps.googleusercontent.com<br />
              GOOGLE_CLIENT_SECRET=tuo-client-secret
            </Text>
          </Paragraph>

          <Paragraph>
            <Text strong>4. Riavvia App</Text>
            <br />
            • Ferma: <Text code>🛑-FERMA-BOM-APP.bat</Text>
            <br />
            • Avvia: <Text code>AVVIA-BOM-APP.bat</Text>
            <br />
            • 🎉 Google OAuth funziona!
          </Paragraph>
        </div>

        <Alert
          message="Alternative sempre disponibili"
          description="Anche senza Google OAuth puoi usare 'Login Demo' o 'Login Email' per testare tutte le funzionalità dell'app."
          type="success"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default GoogleSetupModal;