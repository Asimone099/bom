import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Typography, Avatar, Tag, Table, Button, Select, message, Popconfirm, Space } from 'antd';
import { UserOutlined, CrownOutlined, EyeOutlined, ToolOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { User, UserRole } from '../services/auth.service';

const { Title, Text, Paragraph } = Typography;

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User;
}

interface UserListItem extends User {
  key: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, currentUser }) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Carica lista utenti (solo per admin)
  const loadUsers = async () => {
    if (currentUser.role !== 'admin') return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('bom_token');
      const response = await fetch('http://localhost:5001/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.map((user: User) => ({ ...user, key: user.email })));
      } else {
        message.error('Errore nel caricamento utenti');
      }
    } catch (error) {
      message.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  // Aggiorna ruolo utente
  const updateUserRole = async (email: string, newRole: UserRole) => {
    try {
      const token = localStorage.getItem('bom_token');
      const response = await fetch('http://localhost:5001/api/auth/users/role', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role: newRole }),
      });

      if (response.ok) {
        message.success(`Ruolo aggiornato con successo`);
        loadUsers(); // Ricarica lista
      } else {
        const error = await response.json();
        message.error(error.error || 'Errore nell\'aggiornamento');
      }
    } catch (error) {
      message.error('Errore di connessione');
    }
  };

  // Elimina utente
  const deleteUser = async (email: string) => {
    try {
      const token = localStorage.getItem('bom_token');
      const response = await fetch(`http://localhost:5001/api/auth/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        message.success('Utente eliminato con successo');
        loadUsers(); // Ricarica lista
      } else {
        const error = await response.json();
        message.error(error.error || 'Errore nell\'eliminazione');
      }
    } catch (error) {
      message.error('Errore di connessione');
    }
  };

  useEffect(() => {
    if (visible && currentUser.role === 'admin') {
      loadUsers();
    }
  }, [visible, currentUser.role]);

  // Configurazione colonne tabella utenti
  const columns = [
    {
      title: 'Utente',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: UserListItem) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Ruolo',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => {
        const roleConfig = {
          admin: { color: 'red', icon: <CrownOutlined />, label: 'Admin' },
          manager: { color: 'blue', icon: <ToolOutlined />, label: 'Manager' },
          viewer: { color: 'green', icon: <EyeOutlined />, label: 'Visualizzatore' },
        };
        
        const config = roleConfig[role];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Ultimo Accesso',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date: string) => {
        if (!date) return 'Mai';
        try {
          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            return 'Data non valida';
          }
          return parsedDate.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (error) {
          return 'Errore data';
        }
      },
    },
    {
      title: 'Azioni',
      key: 'actions',
      render: (_: any, record: UserListItem) => {
        if (record.email === currentUser.email) {
          return <Text type="secondary">Tu</Text>;
        }
        
        return (
          <Space>
            <Select
              value={record.role}
              style={{ width: 120 }}
              onChange={(newRole) => updateUserRole(record.email, newRole)}
              size="small"
            >
              <Select.Option value="viewer">
                <EyeOutlined /> Viewer
              </Select.Option>
              <Select.Option value="manager">
                <ToolOutlined /> Manager
              </Select.Option>
              <Select.Option value="admin">
                <CrownOutlined /> Admin
              </Select.Option>
            </Select>
            
            <Popconfirm
              title="Eliminare questo utente?"
              description="Questa azione non può essere annullata."
              onConfirm={() => deleteUser(record.email)}
              okText="Elimina"
              cancelText="Annulla"
              okType="danger"
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // Configurazione permessi per ruolo
  const rolePermissions = {
    admin: [
      'Visualizzare tutti i dati',
      'Modificare BOM e commesse',
      'Eliminare elementi',
      'Gestire utenti e ruoli',
      'Configurare sistema',
      'Importare/Esportare dati'
    ],
    manager: [
      'Visualizzare tutti i dati',
      'Modificare BOM e commesse',
      'Eliminare elementi',
      'Importare/Esportare dati'
    ],
    viewer: [
      'Visualizzare dati (sola lettura)'
    ]
  };

  return (
    <Modal
      title="⚙️ Impostazioni"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Tabs 
        defaultActiveKey="profile"
        items={[
          {
            key: 'profile',
            label: '👤 Profilo',
            children: (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <Avatar 
                size={64} 
                src={currentUser.avatar} 
                icon={<UserOutlined />}
                style={{ marginRight: '16px' }}
              />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {currentUser.name}
                </Title>
                <Text type="secondary">{currentUser.email}</Text>
                <br />
                <Tag 
                  color={
                    currentUser.role === 'admin' ? 'red' : 
                    currentUser.role === 'manager' ? 'blue' : 'green'
                  }
                  icon={
                    currentUser.role === 'admin' ? <CrownOutlined /> :
                    currentUser.role === 'manager' ? <ToolOutlined /> : <EyeOutlined />
                  }
                  style={{ marginTop: '8px' }}
                >
                  {currentUser.role === 'admin' ? 'Amministratore' :
                   currentUser.role === 'manager' ? 'Manager' : 'Visualizzatore'}
                </Tag>
              </div>
            </div>

            <Title level={5}>🔐 Permessi del tuo ruolo:</Title>
            <ul>
              {rolePermissions[currentUser.role].map((permission, index) => (
                <li key={index}>
                  <Text>{permission}</Text>
                </li>
              ))}
            </ul>

            {currentUser.createdAt && (
              <Paragraph type="secondary" style={{ marginTop: '16px' }}>
                <strong>Account creato:</strong> {(() => {
                  try {
                    const date = new Date(currentUser.createdAt);
                    return isNaN(date.getTime()) ? 'Data non valida' : date.toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  } catch {
                    return 'Data non valida';
                  }
                })()}
                <br />
                <strong>Ultimo accesso:</strong> {(() => {
                  if (!currentUser.lastLogin) return 'Mai';
                  try {
                    const date = new Date(currentUser.lastLogin);
                    return isNaN(date.getTime()) ? 'Data non valida' : date.toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  } catch {
                    return 'Data non valida';
                  }
                })()}
              </Paragraph>
            )}
          </Card>
            )
          },
          ...(currentUser.role === 'admin' ? [{
            key: 'users',
            label: '👥 Gestione Utenti',
            children: (
            <Card>
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>👥 Utenti Registrati</Title>
                <Text type="secondary">
                  Gestisci i ruoli e i permessi degli utenti del sistema.
                </Text>
              </div>

              <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                pagination={{ pageSize: 10 }}
                size="small"
              />

              <div style={{ marginTop: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                <Title level={5}>📋 Descrizione Ruoli:</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Tag color="red" icon={<CrownOutlined />}>Admin</Tag>
                    <Text>Accesso completo al sistema, gestione utenti e configurazioni</Text>
                  </div>
                  <div>
                    <Tag color="blue" icon={<ToolOutlined />}>Manager</Tag>
                    <Text>Può modificare dati, importare/esportare, ma non gestire utenti</Text>
                  </div>
                  <div>
                    <Tag color="green" icon={<EyeOutlined />}>Viewer</Tag>
                    <Text>Solo visualizzazione dati, nessuna modifica</Text>
                  </div>
                </Space>
              </div>
            </Card>
            )
          }] : []),
          {
            key: 'system',
            label: '🔧 Sistema',
            children: (
          <Card>
            <Title level={5}>🔧 Informazioni Sistema</Title>
            <Paragraph>
              <strong>Versione:</strong> BOM Management System v1.0.0<br />
              <strong>Ambiente:</strong> Sviluppo<br />
              <strong>Database:</strong> SQLite (locale)<br />
              <strong>Autenticazione:</strong> Google OAuth + JWT<br />
            </Paragraph>

            {currentUser.role === 'admin' && (
              <>
                <Title level={5}>⚙️ Configurazioni Admin</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button type="primary" icon={<ToolOutlined />}>
                    Backup Database
                  </Button>
                  <Button icon={<EditOutlined />}>
                    Configurazioni Sistema
                  </Button>
                  <Button danger icon={<DeleteOutlined />}>
                    Reset Dati Demo
                  </Button>
                </Space>
              </>
            )}
          </Card>
            )
          }
        ]}
      />
    </Modal>
  );
};

export default SettingsModal;