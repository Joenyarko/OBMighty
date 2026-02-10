import { useState, useEffect } from 'react';
import { roleAPI } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import '../styles/App.css';

// Define the Permission Schema
const MODULES = [
    {
        name: 'Dashboard',
        permissions: { read: 'view_dashboard' }
    },
    {
        name: 'Customers',
        permissions: { read: 'view_customers', write: 'create_customers', edit: 'edit_customers', delete: 'delete_customers' }
    },
    {
        name: 'Workers',
        permissions: { read: 'view_users', write: 'manage_users', edit: 'manage_users', delete: 'manage_users' }
    },
    {
        name: 'Inventory',
        permissions: { read: 'view_inventory', write: 'manage_inventory', edit: 'adjust_stock' }
    },
    {
        name: 'Accounting',
        permissions: { read: 'view_accounting', write: 'manage_expenses' }
    },
    {
        name: 'Reports',
        permissions: { read: 'view_reports' }
    },
    {
        name: 'Sales',
        permissions: { read: 'view_sales' }
    },
    {
        name: 'Surplus',
        permissions: { read: 'view_surplus', write: 'manage_surplus', edit: 'manage_surplus', delete: 'manage_surplus' }
    },
    {
        name: 'Payroll',
        permissions: { read: 'view_payroll', write: 'manage_payroll', edit: 'manage_payroll' }
    },
    {
        name: 'Branch Managers',
        permissions: { read: 'view_branches', write: 'manage_branches', edit: 'manage_branches', delete: 'manage_branches' } // Overlaps with Branches but useful context
    },
    {
        name: 'Cards',
        permissions: { read: 'view_cards', write: 'manage_cards', edit: 'manage_cards', delete: 'manage_cards' }
    },
    {
        name: 'Branches',
        permissions: { read: 'view_branches', write: 'manage_branches', edit: 'manage_branches', delete: 'manage_branches' }
    },
    {
        name: 'Settings',
        permissions: { read: 'view_settings', write: 'manage_settings', edit: 'manage_settings' }
    },
    {
        name: 'Payments',
        permissions: { read: 'view_payments', write: 'record_payments', edit: 'reverse_payments', delete: 'reverse_payments' }
    },
    {
        name: 'Box Tracking',
        permissions: { read: 'track_boxes', write: 'track_boxes' } // track_boxes covers viewing and paying on tracking page
    }
];

function Settings() {
    const [activeTab, setActiveTab] = useState('user_permissions');
    const [colors, setColors] = useState({
        primary: '#D4AF37',
        sidebar: '#1A1A1A'
    });

    // Permission State
    const [roles, setRoles] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [currentPermissions, setCurrentPermissions] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    useEffect(() => {
        if (activeTab === 'user_permissions') {
            fetchRoles();
        }
    }, [activeTab]);

    const fetchRoles = async () => {
        setLoadingRoles(true);
        try {
            const response = await roleAPI.getAll();
            setRoles(response.data);
        } catch (error) {
            showError('Failed to fetch roles');
            console.error(error);
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleRoleChange = async (e) => {
        const roleId = e.target.value;
        setSelectedRoleId(roleId);
        if (roleId) {
            const role = roles.find(r => r.id === parseInt(roleId));
            // Assuming role.permissions is loaded (eager loaded in controller)
            // If strictly needing fresh, we can call getOne, but getAll likely returned it.
            // Let's use what we have or fetch if missing.
            if (role) {
                // Determine effectively checked permissions
                // Map object details to array of names
                const permNames = role.permissions.map(p => p.name);
                setCurrentPermissions(permNames);
            }
        } else {
            setCurrentPermissions([]);
        }
    };

    const togglePermission = (permName) => {
        if (!permName || !selectedRoleId) return;

        setCurrentPermissions(prev => {
            if (prev.includes(permName)) {
                return prev.filter(p => p !== permName);
            } else {
                return [...prev, permName];
            }
        });
    };

    const handleNoAccess = (module, isChecked) => {
        if (!selectedRoleId) return;
        const modulePerms = Object.values(module.permissions).filter(Boolean);

        if (isChecked) {
            // Remove all permissions for this module
            setCurrentPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
        } else {
            // Unchecking "No Access" doesn't strictly mean "Give All Access", 
            // usually it just means "Allow editing again". 
            // But logic-wise, if it was checked (No Access), permissions were empty.
            // Unchecking it does nothing until user checks a specific permission.
        }
    };

    const handleFullAccess = (module, isChecked) => {
        if (!selectedRoleId) return;
        const modulePerms = Object.values(module.permissions).filter(Boolean);

        if (isChecked) {
            // Add all permissions for this module
            setCurrentPermissions(prev => {
                const unique = new Set([...prev, ...modulePerms]);
                return [...unique];
            });
        } else {
            // Remove all permissions for this module
            setCurrentPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
        }
    };

    const savePermissions = async () => {
        if (!selectedRoleId) return;

        const result = await showConfirm(
            'Are you sure you want to update permissions for this role?',
            'Save Permissions'
        );

        if (!result.isConfirmed) return;

        try {
            await roleAPI.syncPermissions(selectedRoleId, currentPermissions);
            showSuccess('Permissions updated successfully!');
            fetchRoles(); // Refresh to ensure sync
        } catch (error) {
            showError('Failed to save permissions');
            console.error(error);
        }
    };

    const handleColorChange = (key, value) => {
        setColors(prev => ({ ...prev, [key]: value }));

        if (key === 'primary') {
            document.documentElement.style.setProperty('--primary-color', value);
            document.documentElement.style.setProperty('--yellow', value);
        } else if (key === 'sidebar') {
            document.documentElement.style.setProperty('--sidebar-bg', value);
        }
    };

    const isNoAccess = (module) => {
        const modulePerms = Object.values(module.permissions).filter(Boolean);
        return !modulePerms.some(p => currentPermissions.includes(p));
    };

    const isFullAccess = (module) => {
        const modulePerms = Object.values(module.permissions).filter(Boolean);
        return modulePerms.every(p => currentPermissions.includes(p));
    };

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
                </div>
            )}

            {/* Permission Matrix */}
            {activeTab === 'user_permissions' && (
                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', overflowX: 'auto' }}>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Role to Edit</label>
                            <select
                                style={{
                                    width: '100%', padding: '12px', background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px'
                                }}
                                value={selectedRoleId}
                                onChange={handleRoleChange}
                            >
                                <option value="">-- Select Role --</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id} disabled={role.name === 'ceo'}>
                                        {role.name.toUpperCase()} {role.name === 'ceo' ? '(Full Access - Locked)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedRoleId && (
                            <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.9em', marginTop: '24px' }}>
                                Currently editing permissions for <strong>{roles.find(r => r.id === parseInt(selectedRoleId))?.name.toUpperCase()}</strong>
                            </div>
                        )}
                    </div>

                    {selectedRoleId ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-secondary)' }}>Page Name</th>
                                    <th style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>Read</th>
                                    <th style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>Write</th>
                                    <th style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>Edit</th>
                                    <th style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>Delete</th>
                                    <th style={{ textAlign: 'center', padding: '16px', color: 'var(--primary-color)' }}>Full Access</th>
                                    <th style={{ textAlign: 'center', padding: '16px', color: 'var(--danger-color)' }}>No Access</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map(module => {
                                    const noAccess = isNoAccess(module);
                                    const fullAccess = isFullAccess(module);

                                    return (
                                        <tr key={module.name} style={{ borderBottom: '1px solid var(--border-color)', background: noAccess ? 'rgba(255,0,0,0.05)' : 'transparent' }}>
                                            <td style={{ padding: '16px', fontWeight: '500' }}>{module.name}</td>

                                            {/* Columns for Read, Write, Edit, Delete */}
                                            {['read', 'write', 'edit', 'delete'].map(action => (
                                                <td key={action} style={{ textAlign: 'center', padding: '16px' }}>
                                                    {module.permissions[action] ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={currentPermissions.includes(module.permissions[action])}
                                                            onChange={() => togglePermission(module.permissions[action])}
                                                            style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                                                            disabled={noAccess && !currentPermissions.includes(module.permissions[action])} // Optional: logic to disable if noAccess checked? 
                                                        // Actually, if No Access is checked, everything is unchecked. User must uncheck "No Access" (or check something else) to re-enable.
                                                        />
                                                    ) : (
                                                        <span style={{ color: 'var(--text-secondary)', opacity: 0.3 }}>-</span>
                                                    )}
                                                </td>
                                            ))}

                                            {/* Full Access Toggle */}
                                            <td style={{ textAlign: 'center', padding: '16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={fullAccess}
                                                    onChange={(e) => handleFullAccess(module, e.target.checked)}
                                                    style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* No Access Toggle */}
                                            <td style={{ textAlign: 'center', padding: '16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={noAccess}
                                                    onChange={(e) => handleNoAccess(module, e.target.checked)}
                                                    style={{ transform: 'scale(1.2)', accentColor: 'var(--danger-color)', cursor: 'pointer' }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            Please select a role to configure permissions.
                        </div>
                    )}

                    {selectedRoleId && (
                        <div style={{ marginTop: '24px', textAlign: 'right' }}>
                            <button className="btn-primary" onClick={savePermissions}>Save Permissions</button>
                        </div>
                    )}
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
