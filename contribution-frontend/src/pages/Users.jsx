import { useState, useEffect } from 'react';
import { userAPI, branchAPI, permissionAPI } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/App.css';

import { useNavigate } from 'react-router-dom';

function Users({ roleFilter, title }) {
    const { user, isCEO, isSecretary, isSuperAdmin } = useAuth(); // Added user to destructuring
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Permission Management State
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [userPermissions, setUserPermissions] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        role: roleFilter || 'worker',
        branch_id: ''
    });

    useEffect(() => {
        fetchData();
    }, [roleFilter]);

    useEffect(() => {
        // Auto-assign branch for Secretary when modal opens or user loads
        if (isSecretary && user?.branch_id) {
            setFormData(prev => ({
                ...prev,
                branch_id: user.branch_id,
                role: 'worker' // Secretary can only create workers
            }));
        }
    }, [isSecretary, user, showModal]);

    const fetchData = async () => {
        try {
            const [usersRes, branchesRes] = await Promise.all([
                userAPI.getAll(),
                branchAPI.getAll()
            ]);

            let filteredUsers = usersRes.data.data || usersRes.data;
            if (roleFilter) {
                const userList = Array.isArray(filteredUsers) ? filteredUsers : (filteredUsers.data || []);
                filteredUsers = userList.filter(u => u.roles?.[0]?.name === roleFilter);
            } else {
                filteredUsers = Array.isArray(filteredUsers) ? filteredUsers : (filteredUsers.data || []);
            }

            setUsers(filteredUsers);

            const branchList = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []);
            setBranches(branchList);

        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPermissions = async (user) => {
        if (!isCEO) return;
        try {
            const permsRes = await permissionAPI.getAll();
            setAvailablePermissions(permsRes.data);

            // Fetch fresh details
            const userDetails = await userAPI.get(user.id);
            const freshUser = userDetails.data;

            setSelectedUser(freshUser);

            // Map permissions (assuming direct permissions for now as per requirement for granular control)
            const effectivePerms = freshUser.permissions ? freshUser.permissions.map(p => p.name) : [];
            setUserPermissions(effectivePerms);
            setShowPermissionModal(true);
        } catch (error) {
            console.error('Failed to load permissions', error);
        }
    };

    const handlePermissionToggle = (permName) => {
        if (userPermissions.includes(permName)) {
            setUserPermissions(userPermissions.filter(p => p !== permName));
        } else {
            setUserPermissions([...userPermissions, permName]);
        }
    };

    const handleSavePermissions = async () => {
        const result = await showConfirm(
            `Are you sure you want to update permissions for ${selectedUser.name}?`,
            'Update Permissions'
        );

        if (!result.isConfirmed) return;

        try {
            await permissionAPI.syncUser(selectedUser.id, userPermissions);
            setShowPermissionModal(false);
            fetchData(); // Refresh list
            showSuccess('Permissions updated successfully');
        } catch (error) {
            console.error('Failed to sync permissions', error);
            showError('Failed to update permissions');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Phone Validation (Exactly 10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (formData.phone && !phoneRegex.test(formData.phone)) {
            showError('Phone number must be exactly 10 digits.');
            return;
        }

        // Email Validation (Handled by type="email" but can be reinforced if needed)

        // Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            showError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
            return;
        }

        if (formData.password !== formData.password_confirmation) {
            showError('Passwords do not match.');
            return;
        }

        try {
            await userAPI.create(formData);
            setShowModal(false);
            setFormData({
                name: '', email: '', phone: '', password: '', password_confirmation: '',
                role: roleFilter || 'worker',
                branch_id: isSecretary ? user.branch_id : ''
            });
            fetchData();
            showSuccess('User created successfully');
        } catch (error) {
            console.error('Failed to create user', error);
            showError(error.response?.data?.message || 'Error creating user.');
        }
    };

    return (
        <div className="users-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>{title || 'User Management'}</h1>
                {(isSuperAdmin || isCEO || (isSecretary && roleFilter === 'worker')) && (
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        + Create New {roleFilter === 'worker' ? 'Worker' : roleFilter === 'secretary' ? 'Manager' : 'User'}
                    </button>
                )}
            </div>

            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Name</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Role</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Branch</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
                            {(isSuperAdmin || isCEO || isSecretary) && <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontWeight: '500' }}>{user.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        textTransform: 'uppercase',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: user.roles?.[0]?.name === 'ceo' ? 'var(--primary-color)' : 'var(--text-primary)'
                                    }}>
                                        {user.roles?.[0]?.name || 'N/A'}
                                    </span>
                                </td>
                                <td style={{ padding: '16px' }}>{user.branch?.name || '-'}</td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{ color: '#4CAF50' }}>{user.status || 'Active'}</span>
                                </td>
                                {(isSuperAdmin || isCEO || isSecretary) && (
                                    <td style={{ padding: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {(isSuperAdmin || isCEO) && (
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                                onClick={() => handleOpenPermissions(user)}
                                            >
                                                Permissions
                                            </button>
                                        )}
                                        {user.roles?.[0]?.name === 'worker' && (
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(33, 150, 243, 0.1)', color: '#2196f3', border: '1px solid rgba(33, 150, 243, 0.3)' }}
                                                onClick={() => navigate(`/performance/${user.id}`)}
                                            >
                                                Performance
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showModal && (
                <div className="custom-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="custom-modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Create New Staff</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Phone Number (10 digits)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 0244123456"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    pattern="[0-9]{10}"
                                    title="Phone number must be exactly 10 digits"
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                {isSecretary ? (
                                    <input type="text" value="Worker" disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} />
                                ) : (
                                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="worker">Worker (Collector)</option>
                                        <option value="secretary">Secretary (Branch Admin)</option>
                                    </select>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Assign Branch</label>
                                {isSecretary ? (
                                    <input type="text" value={user?.branch?.name || 'My Branch'} disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} />
                                ) : (
                                    <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} required>
                                        <option value="">Select Branch</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Password (Min 8 characters, Mixed Case, Number & Symbol)</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" value={formData.password_confirmation} onChange={e => setFormData({ ...formData, password_confirmation: e.target.value })} required />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Permission Management Modal */}
            {showPermissionModal && selectedUser && (
                <div className="custom-modal-overlay" onClick={() => setShowPermissionModal(false)}>
                    <div className="custom-modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>Manage Permissions</h2>
                        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                            User: <strong>{selectedUser.name}</strong> ({selectedUser.roles?.[0]?.name})
                        </p>

                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px', maxHeight: '400px', overflowY: 'auto', marginBottom: '24px'
                        }}>
                            {availablePermissions.map(perm => (
                                <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                    <input
                                        type="checkbox"
                                        checked={userPermissions.includes(perm)}
                                        onChange={() => handlePermissionToggle(perm)}
                                    />
                                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                        {perm.replace(/_/g, ' ')}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setShowPermissionModal(false)} style={{ flex: 1 }}>Cancel</button>
                            <button type="button" className="btn-primary" onClick={handleSavePermissions} style={{ flex: 1 }}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;
