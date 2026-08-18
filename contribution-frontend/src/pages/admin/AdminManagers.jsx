import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit2, Building, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/admin/SuperAdmin.css';

function AdminManagers() {
    const [managers, setManagers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create manager modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', company_ids: [] });

    // Assign companies modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
    const [assignLoading, setAssignLoading] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [managersRes, companiesRes] = await Promise.all([
                api.get('/admin/managers'),
                api.get('/admin/companies'),
            ]);
            setManagers(managersRes.data);
            setCompanies(companiesRes.data);
        } catch (err) {
            console.error('Failed to load admin managers', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await api.post('/admin/managers', formData);
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({ icon: 'success', title: 'Manager Created', timer: 1500, showConfirmButton: false, background: '#161920', color: '#fff' });
            setShowCreateModal(false);
            setFormData({ name: '', email: '', password: '', phone: '', company_ids: [] });
            fetchAll();
        } catch (err) {
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to create manager.', background: '#161920', color: '#fff' });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (manager) => {
        const Swal = (await import('sweetalert2')).default;
        const result = await Swal.fire({
            title: `Remove "${manager.name}"?`,
            text: 'This will revoke their super admin access.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#2c2c2c',
            confirmButtonText: 'Yes, remove',
            background: '#161920',
            color: '#fff',
        });
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/admin/managers/${manager.id}`);
            Swal.fire({ icon: 'success', title: 'Removed', timer: 1200, showConfirmButton: false, background: '#161920', color: '#fff' });
            fetchAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to remove.', background: '#161920', color: '#fff' });
        }
    };

    const openAssignModal = (manager) => {
        setAssignTarget(manager);
        setSelectedCompanyIds(manager.managed_companies.map(c => c.id));
        setShowAssignModal(true);
    };

    const toggleCompanySelection = (id) => {
        setSelectedCompanyIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAssign = async () => {
        setAssignLoading(true);
        try {
            await api.post(`/admin/managers/${assignTarget.id}/assign-companies`, {
                company_ids: selectedCompanyIds,
            });
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({ icon: 'success', title: 'Companies Updated', timer: 1200, showConfirmButton: false, background: '#161920', color: '#fff' });
            setShowAssignModal(false);
            fetchAll();
        } catch (err) {
            const Swal = (await import('sweetalert2')).default;
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to assign.', background: '#161920', color: '#fff' });
        } finally {
            setAssignLoading(false);
        }
    };

    const toggleCreateCompany = (id) => {
        setFormData(prev => ({
            ...prev,
            company_ids: prev.company_ids.includes(id)
                ? prev.company_ids.filter(x => x !== id)
                : [...prev.company_ids, id],
        }));
    };

    return (
        <AdminLayout>
            <div className="nex-page-content">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Admin Managers</h1>
                        <p style={{ color: 'var(--nex-text-secondary)', marginTop: '4px', fontSize: '14px' }}>
                            Delegate controlled access to your co-workers
                        </p>
                    </div>
                    <button
                        className="nex-btn-primary"
                        onClick={() => setShowCreateModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                    >
                        <UserPlus size={18} /> Create Manager
                    </button>
                </div>

                {/* Managers Table */}
                <div className="nex-table-container">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--nex-text-secondary)' }}>Loading...</div>
                    ) : managers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--nex-text-secondary)' }}>
                            <UserPlus size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p>No admin managers yet. Create one to delegate access.</p>
                        </div>
                    ) : (
                        <table className="nex-table">
                            <thead>
                                <tr>
                                    <th>Manager</th>
                                    <th>Email</th>
                                    <th>Assigned Organizations</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managers.map(manager => (
                                    <tr key={manager.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6d28d9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
                                                    {manager.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500 }}>{manager.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--nex-text-secondary)' }}>{manager.email}</td>
                                        <td>
                                            {manager.managed_companies.length === 0 ? (
                                                <span style={{ color: 'var(--nex-text-muted)', fontSize: '13px' }}>None assigned</span>
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {manager.managed_companies.map(c => (
                                                        <span key={c.id} style={{ background: 'rgba(109,40,217,0.2)', color: '#a78bfa', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ color: 'var(--nex-text-secondary)', fontSize: '13px' }}>
                                            {new Date(manager.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    title="Assign Companies"
                                                    onClick={() => openAssignModal(manager)}
                                                    style={{ background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.4)', color: '#a78bfa', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Building size={14} /> Assign Orgs
                                                </button>
                                                <button
                                                    title="Remove Manager"
                                                    onClick={() => handleDelete(manager)}
                                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Manager Modal */}
            {showCreateModal && (
                <div className="nex-modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="nex-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="nex-modal-header">
                            <h2>Create Admin Manager</h2>
                            <button className="nex-modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--nex-text-secondary)', marginBottom: '6px', fontSize: '13px' }}>Full Name *</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required
                                        style={{ width: '100%', padding: '10px', background: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--nex-text-secondary)', marginBottom: '6px', fontSize: '13px' }}>Email *</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required
                                        style={{ width: '100%', padding: '10px', background: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--nex-text-secondary)', marginBottom: '6px', fontSize: '13px' }}>Phone</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                        style={{ width: '100%', padding: '10px', background: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--nex-text-secondary)', marginBottom: '6px', fontSize: '13px' }}>Password *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required minLength={8}
                                            style={{ width: '100%', padding: '10px 40px 10px 10px', background: '#0f1115', border: '1px solid #242830', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} />
                                        <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Assign companies at creation */}
                                <div>
                                    <label style={{ display: 'block', color: 'var(--nex-text-secondary)', marginBottom: '8px', fontSize: '13px' }}>Assign Organizations (optional)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', background: '#0f1115', border: '1px solid #242830', borderRadius: '6px', padding: '10px' }}>
                                        {companies.map(c => (
                                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 8px', borderRadius: '4px', background: formData.company_ids.includes(c.id) ? 'rgba(109,40,217,0.15)' : 'transparent' }}>
                                                <input type="checkbox" checked={formData.company_ids.includes(c.id)} onChange={() => toggleCreateCompany(c.id)} />
                                                <span style={{ color: 'white', fontSize: '13px' }}>{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="nex-modal-footer">
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: '#242830', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="nex-btn-purple" disabled={createLoading} style={{ padding: '10px 20px' }}>
                                    {createLoading ? 'Creating...' : 'Create Manager'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Companies Modal */}
            {showAssignModal && assignTarget && (
                <div className="nex-modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="nex-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="nex-modal-header">
                            <h2>Assign Organizations</h2>
                            <button className="nex-modal-close" onClick={() => setShowAssignModal(false)}>&times;</button>
                        </div>
                        <p style={{ color: 'var(--nex-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                            Select which organizations <strong style={{ color: 'white' }}>{assignTarget.name}</strong> can access and manage.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', background: '#0f1115', border: '1px solid #242830', borderRadius: '8px', padding: '12px' }}>
                            {companies.map(c => (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 12px', borderRadius: '6px', background: selectedCompanyIds.includes(c.id) ? 'rgba(109,40,217,0.15)' : 'transparent', border: selectedCompanyIds.includes(c.id) ? '1px solid rgba(109,40,217,0.4)' : '1px solid transparent', transition: 'all 0.15s' }}>
                                    <input type="checkbox" checked={selectedCompanyIds.includes(c.id)} onChange={() => toggleCompanySelection(c.id)} style={{ accentColor: '#6d28d9' }} />
                                    {c.logo_url && <img src={c.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />}
                                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
                                </label>
                            ))}
                        </div>
                        <div className="nex-modal-footer">
                            <button onClick={() => setShowAssignModal(false)} style={{ background: '#242830', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleAssign} className="nex-btn-purple" disabled={assignLoading} style={{ padding: '10px 20px' }}>
                                {assignLoading ? 'Saving...' : 'Save Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default AdminManagers;
