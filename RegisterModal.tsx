import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, UserAddOutlined } from '@ant-design/icons';
import { authService, User } from '../services/auth.service';

const { Title, Text } = Typography;

interface RegisterModalProps {
  visible: boolean;
  onClose: () => void;
  onRegister: (user: User) => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ visible, onClose, onRegister }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleRegister = async (values: { name: string; email: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Le password non coincidono');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.registerUser({
        name: values.name,
        email: values.email,
        password: values.password
      });

      message.success(`Registrazione completata! Benvenuto, ${user.name}!`);
      form.resetFields();
      onClose();
      onRegister(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore durante la registrazione';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserAddOutlined style={{ color: '#1890ff' }} />
          <span>Registrazione Nuovo Utente</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={450}
    >
      <div style={{ padding: '16px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: 60,
            height: 60,
            background: 'linear-gradient(45deg, #1890ff, #722ed1)',
            borderRadius: '50%',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white'
          }}>
            👤
          </div>
          <Title level={4} style={{ margin: 0 }}>
            Crea il tuo account
          </Title>
          <Text type="secondary">
            Registrati per accedere al sistema BOM
          </Text>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Nome completo"
            rules={[
              { required: true, message: 'Inserisci il tuo nome!' },
              { min: 2, message: 'Il nome deve essere di almeno 2 caratteri' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Es: Mario Rossi"
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Inserisci la tua email!' },
              { type: 'email', message: 'Email non valida!' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="mario.rossi@example.com"
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Inserisci una password!' },
              { min: 6, message: 'La password deve essere di almeno 6 caratteri' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Almeno 6 caratteri"
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Conferma Password"
            rules={[
              { required: true, message: 'Conferma la password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Le password non coincidono!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Ripeti la password"
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              icon={<UserAddOutlined />}
              style={{
                width: '100%',
                height: 48,
                borderRadius: '8px',
                fontSize: '16px'
              }}
            >
              Registrati
            </Button>
          </Form.Item>
        </Form>

        <div style={{
          textAlign: 'center',
          padding: '16px',
          background: '#f0f9ff',
          borderRadius: '8px',
          marginTop: '16px'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            🔒 <strong>Accesso sicuro:</strong><br />
            I permessi verranno assegnati automaticamente<br />
            in base alla tua email aziendale
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default RegisterModal;