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
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchUsers();
    }, [page, searchTerm]); // Add debouncing for search in real app

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users', {
                params: {
                    page,
                    search: searchTerm
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
                    <select className="nex-select">
                        <option>All Organizations</option>
                        {/* Populate dynamically if needed */}
                    </select>
                    <button className="nex-btn-purple" onClick={fetchUsers}>
                        Refresh
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
        </AdminLayout>
    );
}

export default AdminUsers;
