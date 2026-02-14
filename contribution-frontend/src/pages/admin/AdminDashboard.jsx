import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Users, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/admin/SuperAdmin.css';

function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        overview: {
            total_companies: 0,
            total_users: 0,
            active_users_week: 0,
            active_companies: 0
        },
        system_health: {
            status: 'checking',
            failed_login_attempts_week: 0
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
                setStats(prev => ({ ...prev, system_health: 'Error' }));
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <AdminLayout>
            <div className="nex-page-title" style={{ marginBottom: '32px' }}>
                <h1>Super Admin Dashboard</h1>
                <p style={{ color: 'var(--nex-text-secondary)', marginTop: '8px' }}>
                    Welcome back, {user?.name}
                </p>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <div className="stat-card" onClick={() => navigate('/admin/companies')} style={{
                    cursor: 'pointer',
                    padding: '24px',
                    backgroundColor: 'var(--nex-bg-card)',
                    border: '1px solid var(--nex-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                }}>
                    <div className="stat-icon" style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        padding: '12px',
                        borderRadius: '8px'
                    }}>
                        <Building size={24} />
                    </div>
                    <div className="stat-details">
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--nex-text-primary)' }}>
                            {loading ? '...' : stats.overview.total_companies} Companies
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--nex-text-secondary)', margin: 0 }}>View and manage tenants</p>
                    </div>
                </div>

                <div className="stat-card" onClick={() => navigate('/admin/users')} style={{
                    cursor: 'pointer',
                    padding: '24px',
                    backgroundColor: 'var(--nex-bg-card)',
                    border: '1px solid var(--nex-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                }}>
                    <div className="stat-icon" style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        padding: '12px',
                        borderRadius: '8px'
                    }}>
                        <Users size={24} />
                    </div>
                    <div className="stat-details">
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--nex-text-primary)' }}>
                            {loading ? '...' : stats.overview.total_users} Users
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--nex-text-secondary)', margin: 0 }}>Total users ({stats.overview.active_users_week} active this week)</p>
                    </div>
                </div>

                <div className="stat-card" style={{
                    padding: '24px',
                    backgroundColor: 'var(--nex-bg-card)',
                    border: '1px solid var(--nex-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                }}>
                    <div className="stat-icon" style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        padding: '12px',
                        borderRadius: '8px'
                    }}>
                        <Activity size={24} />
                    </div>
                    <div className="stat-details">
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--nex-text-primary)' }}>
                            {loading ? '...' : (stats.system_health?.status === 'operational' ? 'Operational' : 'Warning')}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--nex-text-secondary)', margin: 0 }}>
                            System Health ({stats.system_health?.failed_login_attempts_week || 0} failed logins this week)
                        </p>
                    </div>
                </div>
            </div>

            <div className="recent-activity-section" style={{ marginTop: '40px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--nex-text-primary)' }}>Quick Actions</h2>
                <div className="action-buttons">
                    <button className="nex-btn-primary" onClick={() => navigate('/admin/companies')}>
                        <Building size={16} /> Manage Companies
                    </button>
                    {/* Add more quick actions later */}
                </div>
            </div>
        </AdminLayout>
    );
}

export default AdminDashboard;
