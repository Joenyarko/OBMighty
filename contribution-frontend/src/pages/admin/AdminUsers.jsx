import React, { useState, useEffect } from 'react';
import { Search, MoreHorizontal, User, Shield, Building } from 'lucide-react';
import api from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/admin/SuperAdmin.css';

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');

    // Add User State
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [addUserLoading, setAddUserLoading] = useState(false);
    const [newUserData, setNewUserData] = useState({
        name: '',
        email: '',
        password: '',
        company_id: '',
        role: 'worker', // Default
        phone: ''
    });

    useEffect(() => {
        fetchCompanies();
    }, []);
    fetchUsers();
    useEffect(() => {
        fetchUsers();
    }, [page, searchTerm, selectedCompany]); // Re-fetch when filter changes

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/admin/companies');
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users', {
                params: {
                    page,
                    search: searchTerm,
                    company_id: selectedCompany
                }
            });
            setUsers(response.data.data);
            setTotalPages(response.data.last_page);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setAddUserLoading(true);
        try {
            await api.post('/admin/users', newUserData);

            // Success
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({
                icon: 'success',
                title: 'User Created',
                text: 'User has been added successfully.',
                timer: 1500,
                showConfirmButton: false,
                background: '#161920',
                color: '#fff'
            });

            setShowAddUserModal(false);
            setNewUserData({ name: '', email: '', password: '', company_id: '', role: 'worker', phone: '' });
            fetchUsers();

        } catch (error) {
            console.error('Error creating user:', error);
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to create user.',
                background: '#161920',
                color: '#fff'
            });
        } finally {
            setAddUserLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="nex-controls">
                <div className="nex-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>

                <div className="nex-filter-group">
                    <select
                        className="nex-select"
                        value={selectedCompany}
                        onChange={(e) => { setSelectedCompany(e.target.value); setPage(1); }}
                    >
                        <option value="">All Organizations</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                    <button className="nex-btn-purple" onClick={fetchUsers}>
                        Refresh
                    </button>
                    <button className="nex-btn-primary" onClick={() => setShowAddUserModal(true)}>
                        <User size={18} /> Add User
                    </button>
                </div>
            </div>

            <div className="nex-page-title" style={{ marginBottom: '20px' }}>
                <h1>Identities <span>({users.length}+)</span></h1>
                <p style={{ color: 'var(--nex-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                    View all users across the system
                </p>
            </div>

            <div className="nex-table-container">
                <table className="nex-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}><input type="checkbox" /></th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Organization</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--nex-text-secondary)' }}>
                                    Loading identities...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--nex-text-secondary)' }}>
                                    No users found.
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id}>
                                    <td><input type="checkbox" /></td>
                                    <td>
                                        <div className="nex-org-cell">
                                            <div className="nex-org-logo" style={{ backgroundColor: '#6366f1', color: 'white' }}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 500 }}>{user.name}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--nex-text-secondary)' }}>{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {user.roles && user.roles.length > 0 ? (
                                                <span style={{
                                                    background: user.roles[0].name === 'super_admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                    color: user.roles[0].name === 'super_admin' ? '#ef4444' : '#3b82f6',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {user.roles[0].name.replace('_', ' ')}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--nex-text-muted)' }}>No Role</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {user.company ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {user.company.logo_url && (
                                                    <img src={user.company.logo_url} alt="" style={{ width: 16, height: 16, borderRadius: 2 }} />
                                                )}
                                                <span>{user.company.name}</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--nex-text-muted)' }}>Global / None</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`nex-badge ${user.status === 'active' ? 'nex-badge-active' : 'nex-badge-inactive'}`}>
                                            <div className="nex-dot"></div>
                                            {user.status || 'Active'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--nex-text-secondary)' }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <button className="nex-btn-icon">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="nex-pagination">
                <div>Showing page {page} of {totalPages}</div>
                <div className="nex-page-controls">
                    <button
                        className="nex-page-btn"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <button className="nex-page-btn active">{page}</button>
                    <button
                        className="nex-page-btn"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
                    <div className="modal-content" style={{ backgroundColor: '#161920', color: '#fff', border: '1px solid #242830', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%' }}>
                        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Add New User</h2>
                        <form onSubmit={handleAddUser}>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Name</label>
                                <input
                                    type="text"
                                    value={newUserData.name}
                                    onChange={e => setNewUserData({ ...newUserData, name: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Email</label>
                                <input
                                    type="email"
                                    value={newUserData.email}
                                    onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Password</label>
                                <input
                                    type="password"
                                    value={newUserData.password}
                                    onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                                    required
                                    minLength={8}
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px' }}
                                />
                            </div>

                            <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Organization</label>
                                    <select
                                        value={newUserData.company_id}
                                        onChange={e => setNewUserData({ ...newUserData, company_id: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '10px', backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px' }}
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map(company => (
                                            <option key={company.id} value={company.id}>{company.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Role</label>
                                    <select
                                        value={newUserData.role}
                                        onChange={e => setNewUserData({ ...newUserData, role: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '10px', backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px' }}
                                    >
                                        <option value="worker">Worker</option>
                                        <option value="secretary">Manager (Secretary)</option>
                                        <option value="ceo">CEO</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddUserModal(false)}
                                    style={{ backgroundColor: '#242830', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="nex-btn-purple"
                                    disabled={addUserLoading}
                                >
                                    {addUserLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default AdminUsers;
