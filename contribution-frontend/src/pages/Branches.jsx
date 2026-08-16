import { useState, useEffect } from 'react';
import { branchAPI } from '../services/api';
import { showError } from '../utils/sweetalert';
import Layout from '../components/Layout';
import { Trash2 } from 'lucide-react';
import '../styles/App.css';

function Branches() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        status: 'active'
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const response = await branchAPI.getAll();
            setBranches(response.data);
        } catch (error) {
            console.error('Failed to fetch branches', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await branchAPI.create(formData);
            setShowModal(false);
            setFormData({ name: '', code: '', address: '', phone: '', status: 'active' });
            fetchBranches();
        } catch (error) {
            console.error('Failed to create branch', error);
            showError('Error creating branch');
        }
    };

    const handleDelete = async (id) => {
        const Swal = (await import('sweetalert2')).default;
        const result = await Swal.fire({
            title: 'Delete Branch?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4444',
            cancelButtonColor: '#2c2c2c',
            confirmButtonText: 'Yes, delete it!',
            background: '#1a1a1a',
            color: '#ffffff'
        });

        if (result.isConfirmed) {
            try {
                await branchAPI.delete(id);
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Branch has been deleted.',
                    icon: 'success',
                    background: '#1a1a1a',
                    color: '#ffffff',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchBranches();
            } catch (error) {
                console.error('Error deleting branch:', error);
                Swal.fire({
                    title: 'Error!',
                    text: error.response?.data?.message || 'Failed to delete branch.',
                    icon: 'error',
                    background: '#1a1a1a',
                    color: '#ffffff'
                });
            }
        }
    };

    return (
        <div className="branches-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>Branch Management</h1>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    + Add New Branch
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading branches...</div>
            ) : (
                <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {branches.map(branch => (
                        <div key={branch.id} className="card" style={{
                            background: 'var(--card-bg)',
                            padding: '24px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>{branch.name}</h3>
                                <span style={{
                                    background: branch.status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                                    color: branch.status === 'active' ? '#4CAF50' : '#FF4444',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}>{branch.status}</span>
                            </div>

                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                <strong>Code:</strong> {branch.code}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                <strong>Phone:</strong> {branch.phone || 'N/A'}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                                <strong>Address:</strong> {branch.address || 'N/A'}
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                <div>
                                    <span style={{ marginRight: '16px' }}>👥 {branch.users_count || 0} Staff</span>
                                    <span>👤 {branch.customers_count || 0} Customers</span>
                                </div>
                                <button 
                                    onClick={() => handleDelete(branch.id)}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: '#ff4444', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px'
                                    }}
                                    title="Delete Branch"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {branches.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                            No branches found. Create your first branch to get started.
                        </div>
                    )}
                </div>
            )}

            {/* Branch Modal */}
            {showModal && (
                <div className="custom-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="custom-modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Create New Branch</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Branch Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g. Accra Central"
                                />
                            </div>
                            <div className="form-group">
                                <label>Branch Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    placeholder="e.g. ACC-01"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                ></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Branch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Branches;
