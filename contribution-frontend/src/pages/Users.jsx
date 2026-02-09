import { useState, useEffect } from 'react';
import { userAPI, branchAPI } from '../services/api';
import Layout from '../components/Layout';
import '../styles/App.css';

function Users({ roleFilter, title }) {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: roleFilter || 'worker',
        branch_id: ''
    });

    useEffect(() => {
        fetchData();
    }, [roleFilter]); // Re-fetch or re-filter when role changes

    const fetchData = async () => {
        try {
            const [usersRes, branchesRes] = await Promise.all([
                userAPI.getAll(),
                branchAPI.getAll()
            ]);

            // Filter users based on role prop if provided
            let filteredUsers = usersRes.data.data || usersRes.data; // Check if paginated or wrapped
            if (roleFilter) {
                // Handle potential array wrapping
                const userList = Array.isArray(filteredUsers) ? filteredUsers : (filteredUsers.data || []);
                filteredUsers = userList.filter(u => u.roles?.[0]?.name === roleFilter);
            } else {
                filteredUsers = Array.isArray(filteredUsers) ? filteredUsers : (filteredUsers.data || []);
            }

            console.log('Branches API Response:', branchesRes); // Debugging
            setUsers(filteredUsers);

            // Handle different possible API response structures for branches
            const branchList = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []);
            setBranches(branchList);

            // Debugging alert (remove later)
            if (branchList.length === 0) {
                showWarning('Warning: No branches loaded! Check API. Response: ' + JSON.stringify(branchesRes.data));
            } else {
                // alert('Loaded ' + branchList.length + ' branches for dropdown.');
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await userAPI.create(formData);
            setShowModal(false);
            setFormData({
                name: '', email: '', password: '', password_confirmation: '', role: roleFilter || 'worker', branch_id: ''
            });
            fetchData();
        } catch (error) {
            console.error('Failed to create user', error);
            showError('Error creating user. URL might be correct but check permissions.');
        }
    };

    return (
        <div className="users-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>{title || 'User Management'}</h1>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    + Create New {roleFilter === 'worker' ? 'Worker' : roleFilter === 'secretary' ? 'Manager' : 'User'}
                </button>
            </div>

            <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Name</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Role</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Branch</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                                <label>Role</label>
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="worker">Worker (Collector)</option>
                                    <option value="secretary">Secretary (Branch Admin)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assign Branch</label>
                                <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} required>
                                    <option value="">Select Branch</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Password</label>
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
        </div>
    );
}

export default Users;
