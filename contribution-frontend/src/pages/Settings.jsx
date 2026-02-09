import { useState } from 'react';
import '../styles/App.css';

function Settings() {
    const [activeTab, setActiveTab] = useState('user_permissions');
    const [colors, setColors] = useState({
        primary: '#D4AF37',
        sidebar: '#1A1A1A'
    });

    const handleColorChange = (key, value) => {
        setColors(prev => ({ ...prev, [key]: value }));

        if (key === 'primary') {
            document.documentElement.style.setProperty('--primary-color', value);
            document.documentElement.style.setProperty('--yellow', value);
        } else if (key === 'sidebar') {
            document.documentElement.style.setProperty('--sidebar-bg', value);
        }
    };

    const modules = [
        'Dashboard', 'Customers', 'Workers', 'Inventory', 'Accounting', 'Reports'
    ];

    const actions = ['Read', 'Write', 'Edit', 'Delete', 'Full Access'];

    return (
        <div className="settings-page">
            <h1 style={{ color: 'var(--primary-color)', marginBottom: '24px' }}>General Settings</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '32px', overflowX: 'auto' }}>
                {['General', 'User Accounts', 'Notifications', 'User Permissions', 'Theme'].map(tab => {
                    const tabKey = tab.toLowerCase().replace(' ', '_');
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tabKey)}
                            style={{
                                padding: '12px 24px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tabKey ? '2px solid var(--primary-color)' : '2px solid transparent',
                                color: activeTab === tabKey ? 'var(--primary-color)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: activeTab === tabKey ? '700' : '500',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {tab}
                        </button>
                    );
                })}
            </div>

            {/* Theme Customizer */}
            {activeTab === 'theme' && (
                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', maxWidth: '600px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Appearance</h3>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Primary Theme Color</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="color"
                                value={colors.primary}
                                onChange={(e) => handleColorChange('primary', e.target.value)}
                                style={{ width: '60px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            />
                            <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{colors.primary}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Sidebar Background</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="color"
                                value={colors.sidebar}
                                onChange={(e) => handleColorChange('sidebar', e.target.value)}
                                style={{ width: '60px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            />
                            <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{colors.sidebar}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Matrix */}
            {activeTab === 'user_permissions' && (
                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', overflowX: 'auto' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <input
                                type="text"
                                placeholder="Search Pages"
                                style={{
                                    width: '100%', padding: '12px', background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px'
                                }}
                            />
                        </div>
                        <div>
                            <select style={{
                                width: '100%', padding: '12px', background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px'
                            }}>
                                <option>Select Employee Role...</option>
                                <option>Secretary</option>
                                <option>Worker</option>
                            </select>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-secondary)' }}>Page Name</th>
                                {actions.map(action => (
                                    <th key={action} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>{action}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {modules.map(module => (
                                <tr key={module} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '16px', fontWeight: '500' }}>{module} Page</td>
                                    {actions.map(action => (
                                        <td key={`${module}-${action}`} style={{ textAlign: 'center', padding: '16px' }}>
                                            <input type="checkbox" style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)', cursor: 'pointer' }} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '24px', textAlign: 'right' }}>
                        <button className="btn-primary">Save Permissions</button>
                    </div>
                </div>
            )}

            {/* General Placeholder */}
            {activeTab === 'general' && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <h3>General Application Settings</h3>
                    <p>Configure company details, logo, and defaults here.</p>
                </div>
            )}
        </div>
    );
}

export default Settings;
