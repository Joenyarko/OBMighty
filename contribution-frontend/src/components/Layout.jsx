import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Layout.css';

import { useLocation } from 'react-router-dom';

function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState('');
    const { user, logout, isCEO, isSecretary } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const toggleSubmenu = (label) => {
        setOpenSubmenu(openSubmenu === label ? '' : label);
    };

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['ceo', 'secretary', 'worker'] },
        {
            label: 'Customers', icon: '👥', roles: ['ceo', 'secretary', 'worker'],
            children: [
                { path: '/customers', label: 'Add Customer' },
                { path: '/customers/list', label: 'Customer Management' },
            ]
        },
        { path: '/sales', label: 'Sales', icon: '💰', roles: ['ceo', 'secretary', 'worker'] },
        { path: '/surplus', label: 'Surplus', icon: '💵', roles: ['ceo', 'secretary'] },
        { path: '/payroll', label: 'Payroll', icon: '💸', roles: ['ceo'] },
        { path: '/workers', label: 'Workers', icon: '👷', roles: ['ceo', 'secretary'] },
        { path: '/branch-managers', label: 'Branch Managers', icon: '👔', roles: ['ceo'] },
        {
            label: 'Inventory', icon: '📦', roles: ['ceo', 'secretary'],
            children: [
                { path: '/inventory', label: 'Stock List' },
                { path: '/inventory?action=receive', label: 'Receive Stocks' },
                { path: '/inventory?action=adjust', label: 'Adjust Stocks' },
            ]
        },
        { path: '/cards', label: 'Cards', icon: '💳', roles: ['ceo', 'secretary'] },
        { path: '/branches', label: 'Branches', icon: '🏢', roles: ['ceo'] },
        { path: '/users', label: 'Users', icon: '👤', roles: ['ceo'] },
        { path: '/accounting', label: 'Accounting', icon: '📒', roles: ['ceo'] },
        { path: '/reports', label: 'Reports', icon: '📈', roles: ['ceo', 'secretary'] },
        { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['ceo'] },
    ];

    const visibleMenuItems = menuItems.filter(item =>
        item.roles.includes(user?.roles?.[0])
    );

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <button
                    className="menu-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    ☰
                </button>
                <h1>Contribution Manager</h1>
                <div className="user-badge">{user?.name?.charAt(0)}</div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <img src="/logo.jpeg" alt="O.B. Mighty Logo" />
                </div>

                <div className="sidebar-header">
                    <h2>Menu</h2>
                    <button
                        className="close-sidebar"
                        onClick={() => setSidebarOpen(false)}
                    >
                        ✕
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {visibleMenuItems.map((item) => (
                        <div key={item.label}>
                            {item.children ? (
                                <>
                                    <div
                                        className={`nav-item ${location.pathname.startsWith('/inventory') && item.label === 'Inventory' ? 'active' : ''}`}
                                        onClick={() => toggleSubmenu(item.label)}
                                        style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className="nav-icon">{item.icon}</span>
                                            <span className="nav-label">{item.label}</span>
                                        </div>
                                        <span>{openSubmenu === item.label ? '▲' : '▼'}</span>
                                    </div>
                                    {openSubmenu === item.label && (
                                        <div className="submenu" style={{ paddingLeft: '20px', background: 'rgba(0,0,0,0.2)' }}>
                                            {item.children.map(child => (
                                                <Link
                                                    key={child.label}
                                                    to={child.path}
                                                    className={`nav-item ${location.pathname === child.path && location.search === (child.path.split('?')[1] ? '?' + child.path.split('?')[1] : '') ? 'active' : ''}`}
                                                    onClick={() => setSidebarOpen(false)}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <span className="nav-label">{child.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link
                                    to={item.path}
                                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    <span className="nav-label">{item.label}</span>
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Overlay for mobile */}
            {
                sidebarOpen && (
                    <div
                        className="sidebar-overlay"
                        onClick={() => setSidebarOpen(false)}
                    />
                )
            }

            {/* Main Content Area */}
            <div className="main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Desktop Top Header */}
                <header className="desktop-header">
                    <div className="user-info" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{user?.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.roles?.[0]}</span>
                    </div>
                    <button className="btn-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </header>

                {/* Main Content */}
                <main className="main-content" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div >
    );
}

export default Layout;
