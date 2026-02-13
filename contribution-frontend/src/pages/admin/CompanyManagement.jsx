import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Globe, Filter, MoreHorizontal } from 'lucide-react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/admin/SuperAdmin.css';

function CompanyManagement() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [viewingCompany, setViewingCompany] = useState(null);

    const openDetailsModal = (company) => {
        setViewingCompany(company);
    };

    const closeDetailsModal = () => {
        setViewingCompany(null);
    };

    const [logoPreview, setLogoPreview] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        domain: '',
        subdomain: '',
        primary_color: '#007bff',
        logo_url: '',
        is_active: true,
        ceo_name: '',
        ceo_email: '',
        ceo_password: ''
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/admin/companies');
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('domain', formData.domain || '');
        data.append('subdomain', formData.subdomain || '');
        data.append('primary_color', formData.primary_color);
        data.append('is_active', formData.is_active ? '1' : '0');

        if (!editingCompany) {
            data.append('ceo_name', formData.ceo_name);
            data.append('ceo_email', formData.ceo_email);
            data.append('ceo_password', formData.ceo_password);
        }

        if (logoFile) {
            data.append('logo', logoFile);
        }

        if (editingCompany) {
            data.append('_method', 'PUT');
        }

        try {
            const url = editingCompany ? `/admin/companies/${editingCompany.id}` : '/admin/companies';
            await api.post(url, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            fetchCompanies();
            setShowModal(false);
            resetForm();
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: editingCompany ? 'Organization updated' : 'Organization created',
                timer: 1500,
                showConfirmButton: false,
                background: '#161920',
                color: '#fff'
            });
        } catch (error) {
            console.error('Error saving company:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to save organization',
                background: '#161920',
                color: '#fff'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Organization?',
            text: "This will deactivate the organization immediately.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#374151',
            confirmButtonText: 'Yes, delete it',
            background: '#161920',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/admin/companies/${id}`);
                fetchCompanies();
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Organization has been deactivated.',
                    icon: 'success',
                    background: '#161920',
                    color: '#fff'
                });
            } catch (error) {
                console.error('Error deleting company:', error);
            }
        }
    };

    const resetForm = () => {
        setEditingCompany(null);
        setLogoFile(null);
        setLogoPreview('');
        setFormData({
            name: '',
            domain: '',
            subdomain: '',
            primary_color: '#007bff',
            logo_url: '',
            is_active: true,
            ceo_name: '',
            ceo_email: '',
            ceo_password: ''
        });
    };

    const openEditModal = (company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            domain: company.domain || '',
            subdomain: company.subdomain || '',
            primary_color: company.primary_color || '#007bff',
            logo_url: company.logo_url || '',
            is_active: company.is_active
        });
        if (company.logo_url) {
            setLogoPreview(company.logo_url);
        }
        setShowModal(true);
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.domain?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="nex-controls">
                <div className="nex-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="nex-filter-group">
                    <select className="nex-select">
                        <option>Country</option>
                    </select>
                    <select className="nex-select">
                        <option>Members</option>
                    </select>
                    <select className="nex-select">
                        <option>Created at</option>
                    </select>
                    <select className="nex-select">
                        <option>Status</option>
                    </select>
                    <button className="nex-btn-purple">
                        Apply filters
                    </button>
                    <button className="nex-btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <Plus size={18} /> Add organization
                    </button>
                </div>
            </div>

            <div className="nex-page-title" style={{ marginBottom: '20px' }}>
                <h1>Organizations <span>({companies.length})</span></h1>
                <p style={{ color: 'var(--nex-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                    Manage all organizations, view, enable/disable
                </p>
            </div>

            <div className="nex-table-container">
                <table className="nex-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}><input type="checkbox" /></th>
                            <th>ID</th>
                            <th>Organization's name</th>
                            <th>Country</th>
                            <th>Members</th>
                            <th>Created at</th>
                            <th>Last active at</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCompanies.map(company => (
                            <tr key={company.id}>
                                <td><input type="checkbox" /></td>
                                <td style={{ color: 'var(--nex-text-secondary)' }}>{company.id}</td>
                                <td>
                                    <div className="nex-org-cell">
                                        <div className="nex-org-logo" style={{ backgroundColor: company.primary_color }}>
                                            {company.logo_url ? (
                                                <img src={company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                                            ) : (
                                                <span style={{ color: 'white' }}>{company.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{company.name}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>🇬🇭</span>
                                        <span>GH</span>
                                    </div>
                                </td>
                                <td>{company.users_count || 'N/A'}</td>
                                <td>{new Date(company.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                <td>{company.last_active_at ? new Date(company.last_active_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-'}</td>
                                <td>
                                    <span className={`nex-badge ${company.is_active ? 'nex-badge-active' : 'nex-badge-inactive'}`}>
                                        <div className="nex-dot"></div>
                                        {company.is_active ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="nex-btn-icon" onClick={() => handleDelete(company.id)} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                        <button className="nex-btn-icon" onClick={() => openEditModal(company)} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="nex-btn-icon" onClick={() => openDetailsModal(company)} title="View Details">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="nex-pagination">
                <div>Showing 1-{companies.length} of {companies.length} entries</div>
                <div className="nex-page-controls">
                    <button className="nex-page-btn">Previous</button>
                    <button className="nex-page-btn active">1</button>
                    <button className="nex-page-btn">2</button>
                    <button className="nex-page-btn">3</button>
                    <button className="nex-page-btn">...</button>
                    <button className="nex-page-btn">Next</button>
                </div>
            </div>

            {/* Edit/Create Modal */}
            {showModal && (
                // ... (existing modal code) ...
                <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-content" style={{ backgroundColor: '#161920', color: '#fff', border: '1px solid #242830' }}>
                        <h2 style={{ marginBottom: '20px' }}>{editingCompany ? 'Edit Organization' : 'New Organization'}</h2>
                        <form onSubmit={handleSubmit}>
                            {/* ... existing form fields ... */}
                            <div className="form-group">
                                <label style={{ color: '#9ca3af' }}>Organization Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{ backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white' }}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label style={{ color: '#9ca3af' }}>Domain</label>
                                    <input
                                        type="text"
                                        value={formData.domain}
                                        onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                        style={{ backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#9ca3af' }}>Subdomain</label>
                                    <input
                                        type="text"
                                        value={formData.subdomain}
                                        onChange={e => setFormData({ ...formData, subdomain: e.target.value })}
                                        style={{ backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ color: '#9ca3af' }}>Primary Color</label>
                                <input
                                    type="color"
                                    value={formData.primary_color}
                                    onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                    className="h-10 w-full"
                                    style={{ backgroundColor: 'transparent', border: 'none' }}
                                />
                            </div>

                            {!editingCompany && (
                                <>
                                    <div className="divider" style={{ margin: '20px 0', borderTop: '1px solid #242830' }}></div>
                                    <h3 style={{ marginBottom: 15, fontSize: 16, color: 'white' }}>Primary Admin</h3>
                                    <div className="form-group">
                                        <label style={{ color: '#9ca3af' }}>Admin Name</label>
                                        <input
                                            type="text"
                                            value={formData.ceo_name}
                                            onChange={e => setFormData({ ...formData, ceo_name: e.target.value })}
                                            required
                                            style={{ backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ color: '#9ca3af' }}>Admin Email</label>
                                        <input
                                            type="email"
                                            value={formData.ceo_email}
                                            onChange={e => setFormData({ ...formData, ceo_email: e.target.value })}
                                            required
                                            style={{ backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ color: '#9ca3af' }}>Password</label>
                                        <input
                                            type="password"
                                            value={formData.ceo_password}
                                            onChange={e => setFormData({ ...formData, ceo_password: e.target.value })}
                                            required={!editingCompany}
                                            style={{ backgroundColor: '#0f1115', border: '1px solid #242830', color: 'white' }}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label style={{ color: '#9ca3af' }}>Organization Logo</label>
                                <div style={{ border: '2px dashed #242830', padding: 20, textAlign: 'center', borderRadius: 8, cursor: 'pointer' }} onClick={() => document.getElementById('logo-upload').click()}>
                                    {logoFile ? <span style={{ color: 'white' }}>{logoFile.name}</span> : <span style={{ color: '#6b7280' }}>Click to upload logo...</span>}
                                    <input
                                        type="file"
                                        id="logo-upload"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                                {logoPreview && (
                                    <div style={{ marginTop: 10, textAlign: 'center' }}>
                                        <img src={logoPreview} alt="Preview" style={{ maxHeight: 60, borderRadius: 4 }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="flex items-center gap-2" style={{ color: 'white' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    Is Active
                                </label>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ backgroundColor: '#242830', color: 'white', border: 'none' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="nex-btn-purple">
                                    {loading ? 'Saving...' : 'Save Organization'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {viewingCompany && (
                <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
                    <div className="modal-content" style={{ backgroundColor: '#161920', color: '#fff', border: '1px solid #242830', borderRadius: '12px', padding: '0', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>

                        {/* Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #242830', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Organization Details</h2>
                            <button onClick={closeDetailsModal} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px' }}>

                            {/* Branding Section */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden',
                                    backgroundColor: viewingCompany.primary_color || '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }}>
                                    {viewingCompany.logo_url ? (
                                        <img src={viewingCompany.logo_url} alt={viewingCompany.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{viewingCompany.name.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '24px' }}>{viewingCompany.name}</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span className={`nex-badge ${viewingCompany.is_active ? 'nex-badge-active' : 'nex-badge-inactive'}`}>
                                            <div className="nex-dot"></div>
                                            {viewingCompany.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span style={{ fontSize: '14px', color: '#9ca3af', padding: '4px 8px', backgroundColor: '#242830', borderRadius: '4px' }}>
                                            ID: {viewingCompany.id}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                                <div className="detail-item">
                                    <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px', letterSpacing: '0.5px' }}>Domain</label>
                                    <div style={{ fontSize: '15px', color: '#e5e7eb' }}>{viewingCompany.domain || '-'}</div>
                                </div>

                                <div className="detail-item">
                                    <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px', letterSpacing: '0.5px' }}>Subdomain</label>
                                    <div style={{ fontSize: '15px', color: '#e5e7eb' }}>{viewingCompany.subdomain ? `${viewingCompany.subdomain}.yourdomain.com` : '-'}</div>
                                </div>

                                <div className="detail-item">
                                    <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px', letterSpacing: '0.5px' }}>Total Users</label>
                                    <div style={{ fontSize: '15px', color: '#e5e7eb' }}>{viewingCompany.users_count || 0}</div>
                                </div>

                                <div className="detail-item">
                                    <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px', letterSpacing: '0.5px' }}>Created At</label>
                                    <div style={{ fontSize: '15px', color: '#e5e7eb' }}>{new Date(viewingCompany.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                </div>

                                <div className="detail-item">
                                    <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px', letterSpacing: '0.5px' }}>Last Active</label>
                                    <div style={{ fontSize: '15px', color: '#e5e7eb' }}>
                                        {viewingCompany.last_active_at
                                            ? new Date(viewingCompany.last_active_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : 'Never'}
                                    </div>
                                </div>
                            </div>

                            {/* Color Bar */}
                            <div style={{ marginTop: '24px' }}>
                                <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px', letterSpacing: '0.5px' }}>Theme Color</label>
                                <div style={{ height: '24px', borderRadius: '4px', backgroundColor: viewingCompany.primary_color || '#007bff', width: '100%', border: '1px solid #242830' }}></div>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', fontFamily: 'monospace' }}>{viewingCompany.primary_color}</div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div style={{ padding: '24px', borderTop: '1px solid #242830', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#111318', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                            <button className="btn-secondary" onClick={closeDetailsModal} style={{ backgroundColor: '#242830', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                                Close
                            </button>
                            <button className="nex-btn-primary" onClick={() => { closeDetailsModal(); openEditModal(viewingCompany); }} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Edit2 size={16} /> Edit Organization
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </AdminLayout>
    );
}

export default CompanyManagement;
