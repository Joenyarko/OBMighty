import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Users, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Dashboard.css'; // Reusing dashboard styles

function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1>Super Admin Dashboard</h1>
                    <p>Welcome back, {user?.name}</p>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card" onClick={() => navigate('/admin/companies')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>
                        <Building size={24} />
                    </div>
                    <div className="stat-details">
                        <h3>Manage Companies</h3>
                        <p>View and manage tenants</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                        <Users size={24} />
                    </div>
                    <div className="stat-details">
                        <h3>Global Users</h3>
                        <p>Total users across system</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#fff3e0', color: '#ef6c00' }}>
                        <Activity size={24} />
                    </div>
                    <div className="stat-details">
                        <h3>System Health</h3>
                        <p>Operational</p>
                    </div>
                </div>
            </div>

            <div className="recent-activity-section">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                    <button className="btn-primary" onClick={() => navigate('/admin/companies')}>
                        <Building size={16} /> Manage Companies
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
