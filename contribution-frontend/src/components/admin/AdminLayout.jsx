import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building, Users, Settings, LogOut, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin/SuperAdmin.css';

const AdminLayout = ({ children }) => {
    const { user, logout } = useAuth(); // Assuming auth context provides this
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="nex-app">
            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div
                    className="nex-sidebar-overlay"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside className={`nex-sidebar ${isMobileOpen ? 'open' : ''}`}>
                <div className="nex-brand" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                            src="/Neziz-logo2.png"
                            alt="Neziz"
                            className="nex-brand-logo"
                            style={{ width: '32px', height: '32px', objectFit: 'contain', background: 'transparent' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = ""; }}
                        />
                        <div>
                            <div style={{ lineHeight: '1.2' }}>Neziz</div>
                            <div style={{ fontSize: '10px', color: 'var(--nex-text-secondary)', fontWeight: 'normal' }}>SUPER ADMIN</div>
                        </div>
                    </div>
                    <button
                        className="nex-sidebar-close"
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="nex-menu-group">
                    <div className="nex-menu-title">Main</div>
                    <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) => `nex-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/admin/companies"
                        className={({ isActive }) => `nex-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <Building size={18} />
                        Organizations
                    </NavLink>
                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) => `nex-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <Users size={18} />
                        Identities
                    </NavLink>
                </div>

                <div className="nex-menu-group">
                    <div className="nex-menu-title">Profile</div>
                    <NavLink
                        to="/admin/settings"
                        className={({ isActive }) => `nex-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <Settings size={18} />
                        Account settings
                    </NavLink>
                </div>

                <div className="nex-user-profile" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span style={{ fontSize: '14px' }}>Log out</span>
                </div>
            </aside>

            <main className="nex-main">
                <header className="nex-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            className="nex-mobile-toggle"
                            onClick={() => setIsMobileOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        {/* Breadcrumbs placeholder or empty div */}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="nex-user-info-text" style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{user?.name || 'Admin'}</span>
                            <span style={{ fontSize: 12, color: 'var(--nex-text-secondary)' }}>admin</span>
                        </div>
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
