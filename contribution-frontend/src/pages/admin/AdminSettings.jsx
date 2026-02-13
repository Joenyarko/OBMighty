import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';
import Swal from 'sweetalert2';
import '../../styles/admin/SuperAdmin.css';

function AdminSettings() {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: ''
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            }));
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validation for password
        if (formData.password && formData.password !== formData.password_confirmation) {
            Swal.fire({
                icon: 'error',
                title: 'Password Mismatch',
                text: 'Passwords do not match.',
                background: '#161920',
                color: '#fff'
            });
            setLoading(false);
            return;
        }

        try {
            const dataToUpdate = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone
            };

            if (formData.password) {
                dataToUpdate.password = formData.password;
                dataToUpdate.password_confirmation = formData.password_confirmation;
            }

            const response = await api.post('/profile', dataToUpdate);

            // Update context
            setUser(response.data.user);

            // Update local storage just in case (though AuthContext handles init from it usually)
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, ...response.data.user }));

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Profile updated successfully',
                background: '#161920',
                color: '#fff',
                timer: 1500,
                showConfirmButton: false
            });

            // Clear password fields
            setFormData(prev => ({ ...prev, password: '', password_confirmation: '' }));
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to update profile',
                background: '#161920',
                color: '#fff'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="nex-page-title" style={{ marginBottom: '32px' }}>
                <h1>Account Settings</h1>
                <p style={{ color: 'var(--nex-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                    Manage your personal profile and security
                </p>
            </div>

            <div style={{ maxWidth: '600px' }}>
                <div className="nex-card" style={{ padding: '32px' }}>
                    <form onSubmit={handleSubmit}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: 'var(--nex-text-primary)' }}>Profile Information</h3>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--nex-text-secondary)', fontSize: '14px' }}>Full Name</label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nex-text-muted)' }} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 40px',
                                        backgroundColor: 'var(--nex-bg-main)',
                                        border: '1px solid var(--nex-border)',
                                        borderRadius: '8px',
                                        color: 'var(--nex-text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--nex-text-secondary)', fontSize: '14px' }}>Email Address</label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nex-text-muted)' }} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 40px',
                                        backgroundColor: 'var(--nex-bg-main)',
                                        border: '1px solid var(--nex-border)',
                                        borderRadius: '8px',
                                        color: 'var(--nex-text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="divider" style={{ width: '100%', height: '1px', backgroundColor: 'var(--nex-border)', margin: '32px 0' }}></div>

                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: 'var(--nex-text-primary)' }}>Security</h3>

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
                            <p style={{ fontSize: '13px', color: '#93c5fd', margin: 0, lineHeight: 1.5 }}>
                                Leave password fields empty if you don't want to change your password.
                            </p>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--nex-text-secondary)', fontSize: '14px' }}>New Password</label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nex-text-muted)' }} />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Min. 8 characters"
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 40px',
                                        backgroundColor: 'var(--nex-bg-main)',
                                        border: '1px solid var(--nex-border)',
                                        borderRadius: '8px',
                                        color: 'var(--nex-text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--nex-text-secondary)', fontSize: '14px' }}>Confirm New Password</label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nex-text-muted)' }} />
                                <input
                                    type="password"
                                    value={formData.password_confirmation}
                                    onChange={e => setFormData({ ...formData, password_confirmation: e.target.value })}
                                    placeholder="Confirm new password"
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 40px',
                                        backgroundColor: 'var(--nex-bg-main)',
                                        border: '1px solid var(--nex-border)',
                                        borderRadius: '8px',
                                        color: 'var(--nex-text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                className="nex-btn-primary"
                                disabled={loading}
                                style={{ minWidth: '140px', justifyContent: 'center' }}
                            >
                                {loading ? 'Saving...' : (
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
        </AdminLayout>
    );
}

export default AdminSettings;
