import { useState, useEffect } from 'react';
import { roleAPI } from '../services/api';
import api from '../services/api'; // Add general api import for profile update
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { User, Lock, Mail, Save, AlertCircle, Shield, Sliders } from 'lucide-react'; // Import icons
import Swal from 'sweetalert2'; // Import Swal for profile alerts
import '../styles/App.css';

// ... (MODULES constant remains the same, no changes needed there)
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
    const { user, setUser, hasPermission, isCEO } = useAuth(); // Get auth context
    const [activeTab, setActiveTab] = useState('profile'); // Default to profile

    // Profile State
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: ''
    });

    const [colors, setColors] = useState({
        primary: '#D4AF37',
        sidebar: '#1A1A1A'
    });

    // Permission State
    const [roles, setRoles] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [currentPermissions, setCurrentPermissions] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    // Initialize Profile Data
    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            }));
        }
    }, [user]);

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

    // --- Profile Handlers ---
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);

        // Validation for password
        if (profileData.password && profileData.password !== profileData.password_confirmation) {
            Swal.fire({
                icon: 'error',
                title: 'Password Mismatch',
                text: 'Passwords do not match.',
                confirmButtonColor: 'var(--primary-color)'
            });
            setProfileLoading(false);
            return;
        }

        try {
            const dataToUpdate = {
                name: profileData.name,
                email: profileData.email,
                phone: profileData.phone
            };

            if (profileData.password) {
                dataToUpdate.password = profileData.password;
                dataToUpdate.password_confirmation = profileData.password_confirmation;
            }

            const response = await api.post('/profile', dataToUpdate);

            // Update context
            setUser(response.data.user);

            // Update local storage
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, ...response.data.user }));

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Profile updated successfully',
                timer: 1500,
                showConfirmButton: false,
                confirmButtonColor: 'var(--primary-color)'
            });

            // Clear password fields
            setProfileData(prev => ({ ...prev, password: '', password_confirmation: '' }));
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to update profile',
                confirmButtonColor: 'var(--primary-color)'
            });
        } finally {
            setProfileLoading(false);
        }
    };


    // --- Permission Handlers ---
    const handleRoleChange = async (e) => {
        const roleId = e.target.value;
        setSelectedRoleId(roleId);
        if (roleId) {
            const role = roles.find(r => r.id === parseInt(roleId));
            if (role) {
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
            setCurrentPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
        }
    };

    const handleFullAccess = (module, isChecked) => {
        if (!selectedRoleId) return;
        const modulePerms = Object.values(module.permissions).filter(Boolean);

        if (isChecked) {
            setCurrentPermissions(prev => {
                const unique = new Set([...prev, ...modulePerms]);
                return [...unique];
            });
        } else {
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
            fetchRoles();
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

    const canManagePermissions = hasPermission('manage_settings') || isCEO;

    return (
        <div className="settings-page">
            <h1 style={{ color: 'var(--primary-color)', marginBottom: '24px' }}>Settings</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '32px', overflowX: 'auto' }}>
                <button
                    onClick={() => setActiveTab('profile')}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'profile' ? '2px solid var(--primary-color)' : '2px solid transparent',
                        color: activeTab === 'profile' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'profile' ? '700' : '500',
                        whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <User size={18} />
                    Profile & Security
                </button>

                {canManagePermissions && (
                    <button
                        onClick={() => setActiveTab('user_permissions')}
                        style={{
                            padding: '12px 24px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'user_permissions' ? '2px solid var(--primary-color)' : '2px solid transparent',
                            color: activeTab === 'user_permissions' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: activeTab === 'user_permissions' ? '700' : '500',
                            whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Shield size={18} />
                        User Permissions
                    </button>
                )}

                {canManagePermissions && (
                    <button
                        onClick={() => setActiveTab('theme')}
                        style={{
                            padding: '12px 24px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'theme' ? '2px solid var(--primary-color)' : '2px solid transparent',
                            color: activeTab === 'theme' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: activeTab === 'theme' ? '700' : '500',
                            whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Sliders size={18} />
                        Appearance
                    </button>
                )}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div style={{ maxWidth: '600px' }}>
                    <div className="card" style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <form onSubmit={handleProfileSubmit}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>Profile Information</h3>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Full Name</label>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        value={profileData.name}
                                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 10px 10px 40px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Email Address</label>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 10px 10px 40px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="divider" style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', margin: '32px 0' }}></div>

                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>Security</h3>

                            <div className="info-box" style={{
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                padding: '16px',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <AlertCircle size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    Leave password fields empty if you don't want to change your password.
                                </p>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>New Password</label>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="password"
                                        value={profileData.password}
                                        onChange={e => setProfileData({ ...profileData, password: e.target.value })}
                                        placeholder="Min. 8 characters"
                                        style={{
                                            width: '100%',
                                            padding: '10px 10px 10px 40px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Confirm New Password</label>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="password"
                                        value={profileData.password_confirmation}
                                        onChange={e => setProfileData({ ...profileData, password_confirmation: e.target.value })}
                                        placeholder="Confirm new password"
                                        style={{
                                            width: '100%',
                                            padding: '10px 10px 10px 40px',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={profileLoading}
                                    style={{
                                        minWidth: '140px',
                                        justifyContent: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {profileLoading ? 'Saving...' : (
                                        <>
                                            <Save size={18} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Theme Customizer */}
            {activeTab === 'theme' && canManagePermissions && (
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
            {activeTab === 'user_permissions' && canManagePermissions && (
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
                                                            disabled={noAccess && !currentPermissions.includes(module.permissions[action])}
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
        </div>
    );
}

export default Settings;
