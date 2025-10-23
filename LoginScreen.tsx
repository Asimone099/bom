import React, { useState } from 'react';
import { Button, Card, Typography, Space, Divider, Form, Input, message } from 'antd';
import { GoogleOutlined, UserOutlined, LockOutlined, LoginOutlined, SettingOutlined, UserAddOutlined } from '@ant-design/icons';
import { authService, User } from '../services/auth.service';
import GoogleSetupModal from './GoogleSetupModal';
import RegisterModal from './RegisterModal';

const { Title, Text } = Typography;

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Login Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const userData = await authService.loginWithGoogle();
      
      // Mostra messaggio appropriato per nuovo utente o login esistente
      if (userData.isNewUser) {
        message.success(userData.welcomeMessage || 'Account creato con successo! Benvenuto nel sistema BOM!');
      } else {
        message.success(userData.welcomeMessage || 'Login con Google effettuato con successo!');
      }
      
      onLogin(userData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore durante il login con Google';
      
      if (errorMessage.includes('Google OAuth non configurato')) {
        message.warning('Google OAuth non configurato');
        setShowGoogleSetup(true);
      } else {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Login demo rimosso per sicurezza

  // Login con email/password
  const handleEmailLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const userData = await authService.loginWithEmail(values);
      message.success('Login effettuato con successo!');
      onLogin(userData);
    } catch (error) {
      message.error('Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          borderRadius: '16px',
          border: 'none'
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(45deg, #1890ff, #722ed1)',
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: 'white'
          }}>
            📊
          </div>
          <Title level={2} style={{ margin: 0, color: '#262626' }}>
            BOM Management
          </Title>
          <Text type="secondary">
            Accedi per gestire le tue distinte base
          </Text>
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Login con Google */}
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            loading={loading}
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              height: 48,
              background: '#db4437',
              borderColor: '#db4437',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          >
            Accedi con Google
          </Button>

          <Divider>oppure</Divider>

          {/* Login con Email */}
          <Form
            name="login"
            onFinish={handleEmailLogin}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Inserisci la tua email!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email"
                size="large"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Inserisci la password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<LoginOutlined />}
                loading={loading}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                Accedi
              </Button>
            </Form.Item>
          </Form>

          <Divider>Non hai un account?</Divider>

          {/* Pulsante Registrazione */}
          <Button
            type="default"
            size="large"
            icon={<UserAddOutlined />}
            onClick={() => setShowRegister(true)}
            style={{
              width: '100%',
              height: 48,
              borderRadius: '8px',
              fontSize: '16px',
              borderColor: '#1890ff',
              color: '#1890ff'
            }}
          >
            Registrati
          </Button>

          <Divider>Accesso sicuro</Divider>

          {/* Messaggio informativo */}
          <div style={{
            textAlign: 'center',
            padding: '16px',
            background: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #bae7ff'
          }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              🔒 Sistema sicuro - Solo utenti autorizzati
            </Text>
          </div>
        </Space>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Accedendo accetti i nostri termini di servizio
          </Text>
          <br />
          <Button 
            type="link" 
            size="small" 
            icon={<SettingOutlined />}
            onClick={() => setShowGoogleSetup(true)}
            style={{ fontSize: '12px', padding: '4px 0' }}
          >
            Configura Google OAuth
          </Button>
        </div>
      </Card>

      {/* Modal Setup Google OAuth */}
      <GoogleSetupModal 
        visible={showGoogleSetup}
        onClose={() => setShowGoogleSetup(false)}
      />

      {/* Modal Registrazione */}
      <RegisterModal 
        visible={showRegister}
        onClose={() => setShowRegister(false)}
        onRegister={onLogin}
      />
    </div>
  );
};

export default LoginScreen;