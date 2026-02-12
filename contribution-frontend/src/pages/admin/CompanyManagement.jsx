import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Globe, Shield } from 'lucide-react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import '../../styles/Customers.css'; // Reusing customer list styles
import '../../styles/CompanyManagement.css'; // Specific overrides

function CompanyManagement() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        domain: '',
        subdomain: '',
        primary_color: '#007bff',
        logo_url: '', // Still kept for existing value
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

        // Create FormData object
        const data = new FormData();
        data.append('name', formData.name);
        data.append('domain', formData.domain || '');
        data.append('subdomain', formData.subdomain || '');
        data.append('primary_color', formData.primary_color);
        data.append('is_active', formData.is_active ? '1' : '0');

        // Append CEO details if creating new company
        if (!editingCompany) {
            data.append('ceo_name', formData.ceo_name);
            data.append('ceo_email', formData.ceo_email);
            data.append('ceo_password', formData.ceo_password);
        }

        // Append file if selected
        if (logoFile) {
            data.append('logo', logoFile);
        }

        // Include _method=PUT for update to work with FormData in Laravel
        if (editingCompany) {
            data.append('_method', 'PUT');
        }

        try {
            if (editingCompany) {
                // Determine headers for multipart/form-data
                await api.post(`/admin/companies/${editingCompany.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/admin/companies', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            fetchCompanies();
            setShowModal(false);
            resetForm();
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: editingCompany ? 'Company updated successfully' : 'Company created successfully',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error saving company:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save company. ' + (error.response?.data?.message || '')
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You are about to deactivate this company. They will lose access immediately.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, deactivate it!'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/admin/companies/${id}`);
                await fetchCompanies();
                Swal.fire(
                    'Deactivated!',
                    'The company has been deactivated.',
                    'success'
                );
            } catch (error) {
                console.error('Error deleting company:', error);
                Swal.fire(
                    'Error!',
                    'Failed to deactivate company.',
                    'error'
                );
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
        <div className="customers-container">
            <header className="page-header">
                <div>
                    <h1>Company Management</h1>
                    <p>Create and manage tenants</p>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    <Plus size={20} /> Add Company
                </button>
            </header>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Domain / Subdomain</th>
                                <th>Branding</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCompanies.map(company => (
                                <tr key={company.id}>
                                    <td>
                                        <div className="customer-info">
                                            <div className="avatar" style={{ backgroundColor: company.primary_color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {company.logo_url ? (
                                                    <img src={company.logo_url} alt={company.name} style={{ width: 'auto', height: '100%', maxHeight: '40px', maxWidth: '40px', objectFit: 'contain' }} />
                                                ) : (
                                                    company.name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium">{company.name}</div>
                                                <div className="text-sm text-gray">ID: {company.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            {company.domain && <span className="badge"><Globe size={12} /> {company.domain}</span>}
                                            <span className="text-sm">{company.subdomain}.obmighty.com</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div style={{ width: 20, height: 20, backgroundColor: company.primary_color, borderRadius: '50%' }}></div>
                                            <span className="text-sm">{company.primary_color}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${company.is_active ? 'active' : 'inactive'}`}>
                                            {company.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="action-btn edit" onClick={() => openEditModal(company)} title="Edit">
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="action-btn delete" onClick={() => handleDelete(company.id)} title="Deactivate">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingCompany ? 'Edit Company' : 'New Company'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><XCircle size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Company Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Custom Domain (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.domain}
                                        onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                        placeholder="client.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Subdomain</label>
                                    <input
                                        type="text"
                                        value={formData.subdomain}
                                        onChange={e => setFormData({ ...formData, subdomain: e.target.value })}
                                        placeholder="client"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Primary Color</label>
                                    <input
                                        type="color"
                                        value={formData.primary_color}
                                        onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                        className="h-10 w-full"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Company Logo</label>
                                    <div className="file-upload-wrapper" style={{ width: '100%' }}>
                                        <input
                                            type="file"
                                            id="logo-upload"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="logo-upload" className="file-upload-btn">
                                            {logoFile ? logoFile.name : 'Choose Image...'}
                                        </label>
                                    </div>
                                    {logoPreview && (
                                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                                            <img src={logoPreview} alt="Preview" style={{ maxHeight: 60, borderRadius: 4 }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    Is Active
                                </label>
                            </div>

                            {!editingCompany && (
                                <>
                                    <div className="divider" style={{ margin: '20px 0', borderTop: '1px solid var(--border-color)', opacity: 0.5 }}></div>
                                    <h3 style={{ marginBottom: 15, fontSize: 16, color: 'var(--text-primary)' }}>CEO / Primary Admin</h3>

                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.ceo_name}
                                            onChange={e => setFormData({ ...formData, ceo_name: e.target.value })}
                                            required={!editingCompany}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <input
                                                type="email"
                                                value={formData.ceo_email}
                                                onChange={e => setFormData({ ...formData, ceo_email: e.target.value })}
                                                required={!editingCompany}
                                                placeholder="ceo@company.com"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Password</label>
                                            <input
                                                type="password"
                                                value={formData.ceo_password}
                                                onChange={e => setFormData({ ...formData, ceo_password: e.target.value })}
                                                required={!editingCompany}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Company'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Add CSS for file input visual
const styles = `
.file-upload-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-block;
}
.file-upload-btn {
    border: 2px dashed var(--border-color);
    color: var(--text-secondary);
    background-color: var(--bg-color);
    padding: 8px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
    text-align: center;
    transition: all 0.3s;
}
.file-upload-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
}
`;

export default CompanyManagement;
