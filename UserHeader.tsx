import React from 'react';
import { Avatar, Dropdown, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Text } = Typography;

import { User } from '../services/auth.service';

interface UserHeaderProps {
    user: User;
    onLogout: () => void;
    onOpenSettings: () => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({ user, onLogout, onOpenSettings }) => {
    const menuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: (
                <div style={{ padding: '4px 0' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{user.name}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>{user.email}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                        Ruolo: <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{user.role}</span>
                    </div>
                    {user.lastLogin && (
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            {(() => {
                                try {
                                    const date = new Date(user.lastLogin);
                                    if (isNaN(date.getTime())) {
                                        console.warn('Invalid lastLogin date:', user.lastLogin);
                                        return null; // Non mostrare nulla se la data non è valida
                                    }
                                    return `Ultimo accesso: ${date.toLocaleString('it-IT', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}`;
                                } catch (error) {
                                    console.error('Error formatting lastLogin date:', error);
                                    return null;
                                }
                            })()}
                        </div>
                    )}
                </div>
            ),
        },
        {
            type: 'divider',
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Impostazioni',
            onClick: onOpenSettings,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Esci',
            onClick: onLogout,
        },
    ];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #1890ff, #722ed1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    📊 BOM Management System
                </div>
            </div>

            <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <div style={{ textAlign: 'right' }}>
                        <Text strong style={{ display: 'block', fontSize: '14px' }}>
                            {user.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                            {user.email}
                        </Text>
                        {user.lastLogin && (() => {
                            try {
                                const date = new Date(user.lastLogin);
                                if (isNaN(date.getTime())) {
                                    console.warn('Invalid lastLogin date in dropdown:', user.lastLogin);
                                    return null;
                                }
                                return (
                                    <Text type="secondary" style={{ fontSize: '11px', opacity: 0.7 }}>
                                        Ultimo accesso: {date.toLocaleString('it-IT', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                );
                            } catch (error) {
                                console.error('Error formatting lastLogin date in dropdown:', error);
                                return null;
                            }
                        })()}
                    </div>
                    <Avatar
                        size={40}
                        src={user.avatar}
                        icon={<UserOutlined />}
                        style={{
                            background: user.avatar ? undefined : '#1890ff',
                            border: '2px solid #f0f0f0'
                        }}
                    />
                </div>
            </Dropdown>
        </div>
    );
};

export default UserHeader;