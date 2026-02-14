import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext'; // Import hook
import {
    LayoutDashboard, Users, UserPlus, ShoppingBag, Truck,
    ClipboardList, Banknote, CreditCard, Building, UserCircle,
    FileBarChart, Settings, LogOut, ChevronLeft, ChevronRight,
    Menu, X, ChevronDown, ChevronUp, Package, Layers, Shield
} from 'lucide-react';
import '../styles/Layout.css';

function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
    const [collapsed, setCollapsed] = useState(false); // Desktop toggle
    const [openSubmenu, setOpenSubmenu] = useState('');
    const { user, company, logout, isCEO, isSecretary, hasRole } = useAuth();
    const { tenant } = useTenant(); // Get tenant config
    const navigate = useNavigate();
    const location = useLocation();
    const mainContentRef = useRef(null);

    // Persist collapsed state
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState) setCollapsed(JSON.parse(savedState));
    }, []);

    const toggleCollapsed = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
        // Close submenus when collapsing
        if (newState) setOpenSubmenu('');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const toggleSubmenu = (label) => {
        if (collapsed) {
            setCollapsed(false); // Auto-expand if clicking a submenu trigger
            setTimeout(() => setOpenSubmenu(label), 100);
        } else {
            setOpenSubmenu(openSubmenu === label ? '' : label);
        }
    };

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, permission: 'view_dashboard', section: 'OVERVIEW' },
        {
            label: 'Customers', icon: <Users size={20} />, permission: 'view_customers', section: 'OVERVIEW',
            children: [
                { path: '/customers', label: 'Add Customer', permission: 'create_customers' },
                { path: '/customers/list', label: 'Management', permission: 'view_customers' },
            ]
        },
        { path: '/sales', label: 'Sales', icon: <ShoppingBag size={20} />, permission: 'view_sales', section: 'OVERVIEW' },
        {
            label: 'Inventory', icon: <Package size={20} />, permission: 'view_inventory', section: 'OVERVIEW',
            children: [
                { path: '/inventory', label: 'Stock List', permission: 'view_inventory' },
                { path: '/inventory?action=receive', label: 'Receive Stocks', permission: 'manage_inventory' },
                { path: '/inventory?action=adjust', label: 'Adjust Stocks', permission: 'adjust_stock' },
            ]
        },
        { path: '/surplus', label: 'Surplus', icon: <Banknote size={20} />, permission: 'view_surplus', section: 'OVERVIEW' },
        { path: '/payroll', label: 'Payroll', icon: <ClipboardList size={20} />, permission: 'view_payroll', section: 'OVERVIEW' },
        { path: '/workers', label: 'Workers', icon: <UserCircle size={20} />, permission: 'view_users', section: 'OVERVIEW' },
        { path: '/branch-managers', label: 'Managers', icon: <UserPlus size={20} />, permission: 'manage_branches', section: 'OVERVIEW' },
        { path: '/cards', label: 'Cards', icon: <CreditCard size={20} />, permission: 'view_cards', section: 'OVERVIEW' },
        { path: '/branches', label: 'Branches', icon: <Building size={20} />, permission: 'view_branches', section: 'OVERVIEW' },
        { path: '/users', label: 'Users', icon: <Users size={20} />, permission: 'view_users', section: 'OVERVIEW' },
        { path: '/accounting', label: 'Accounting', icon: <FileBarChart size={20} />, permission: 'view_accounting', section: 'OVERVIEW' },
        { path: '/reports', label: 'Reports', icon: <FileBarChart size={20} />, permission: 'view_reports', section: 'OVERVIEW' },
        { path: '/activity-log', label: 'Activity Log', icon: <FileBarChart size={20} />, permission: 'view_reports', section: 'OVERVIEW' },
        { path: '/payments', label: 'Payments', icon: <CreditCard size={20} />, permission: 'view_payments', section: 'OVERVIEW' },
        { path: '/bulk-entry', label: 'Bulk Entry', icon: <Layers size={20} />, permission: 'record_payments', section: 'OVERVIEW' }, // Visible to workers/secretary

        // Account Section
        { path: '/settings', label: 'Settings', icon: <Settings size={20} />, permission: null, section: 'ACCOUNT' },
        // Worker Performance Link
        ...(user?.roles?.some(r => r.name === 'worker') ? [{
            path: `/performance/${user.id}`,
            label: 'My Performance',
            icon: <FileBarChart size={20} />,
            permission: null,
            section: 'ACCOUNT'
        }] : []),

        // Super Admin Link
        ...(hasRole('super_admin') ? [{
            path: '/admin/dashboard',
            label: 'Super Admin',
            icon: <Shield size={20} />,
            permission: null,
            section: 'ACCOUNT'
        }] : []),
    ];

    const hasPermission = (requiredPermission) => {
        if (!requiredPermission) return true;
        return user?.permissions?.some(p => p.name === requiredPermission || p === requiredPermission)
            || user?.roles?.some(r => r.name === 'ceo');
    };

    const visibleMenuItems = menuItems.filter(item => {
        if (!hasPermission(item.permission)) return false;
        if (item.children) {
            item.children = item.children.filter(child => hasPermission(child.permission));
            return item.children.length > 0;
        }
        return true;
    });

    const overviewItems = visibleMenuItems.filter(i => i.section === 'OVERVIEW');
    const accountItems = visibleMenuItems.filter(i => i.section === 'ACCOUNT');

    const renderMenuItem = (item) => {
        const isActive = location.pathname.startsWith(item.path);
        const hasChildren = item.children && item.children.length > 0;
        const isSubmenuOpen = openSubmenu === item.label;

        if (hasChildren) {
            return (
                <div key={item.label} className="nav-group">
                    <div
                        className={`nav-item ${isSubmenuOpen ? 'active-parent' : ''}`}
                        onClick={() => toggleSubmenu(item.label)}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && (
                            <>
                                <span className="nav-label">{item.label}</span>
                                <span className="nav-arrow">
                                    {isSubmenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </span>
                            </>
                        )}
                    </div>
                    {isSubmenuOpen && !collapsed && (
                        <div className="submenu">
                            {item.children.map(child => (
                                <Link
                                    key={child.label}
                                    to={child.path}
                                    className={`nav-sub-item ${location.pathname === child.path && location.search === (child.path.split('?')[1] ? '?' + child.path.split('?')[1] : '') ? 'active' : ''}`}
                                >
                                    <span className="sub-dot"></span>
                                    <span>{child.label}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.label}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
                onClick={() => setSidebarOpen(false)} // Mobile close
            >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
            </Link>
        );
    };

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <div className="flex items-center gap-3">
                    <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu size={24} />
                    </button>
                </div>
                <div className="user-badge">{user?.name?.charAt(0)}</div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="brand">
                        <img
                            src={company?.logo_url || tenant?.logo_url || ''}
                            alt="Logo"
                            className="logo"
                        />
                        {!collapsed && (
                            <div className="brand-text">
                                <h2>{company?.name || tenant?.app_name || 'Contribution Manager'}</h2>
                                <span>Contribution Manager</span>
                            </div>
                        )}
                    </div>
                    {/* Desktop Toggle */}
                    <button className="collapse-btn" onClick={toggleCollapsed}>
                        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                    {/* Mobile Close */}
                    <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {/* OVERVIEW SECTION */}
                    <div className="nav-section">
                        {!collapsed && <div className="section-title">OVERVIEW</div>}
                        {overviewItems.map(renderMenuItem)}
                    </div>

                    {/* ACCOUNT SECTION */}
                    <div className="nav-section">
                        {!collapsed && <div className="section-title">ACCOUNT</div>}
                        {accountItems.map(renderMenuItem)}

                        <button className="nav-item logout-btn" onClick={handleLogout} title={collapsed ? 'Logout' : ''}>
                            <span className="nav-icon"><LogOut size={20} /></span>
                            {!collapsed && <span className="nav-label">Log out</span>}
                        </button>
                    </div>
                </nav>

                {/* User Profile (Optional Bottom Section) */}
                {!collapsed && (
                    <div className="sidebar-footer">
                        <div className="user-profile">
                            <div className="user-avatar">{user?.name?.charAt(0)}</div>
                            <div className="user-details">
                                <span className="name">{user?.name}</span>
                                <span className="email">{user?.email}</span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* Main Content Area */}
            <div className={`main-wrapper ${collapsed ? 'expanded' : ''}`}>
                {/* Desktop Top Header */}
                <header className="desktop-header">
                    <div className="user-info">
                        <span className="greeting">Welcomeback, <strong>{user?.name}</strong></span>
                        <span className="role-badge">{user?.roles?.[0]}</span>
                    </div>
                </header>

                <main className="main-content" ref={mainContentRef}>
                    {children}
                </main>

                <ScrollToTop scrollContainerRef={mainContentRef} />
            </div>
        </div>
    );
}

function ScrollToTop({ scrollContainerRef }) {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        const target = scrollContainerRef?.current || window;
        const scrollTop = target === window ? window.scrollY : target.scrollTop;
        setIsVisible(scrollTop > 300);
    };

    const scrollToTop = () => {
        const target = scrollContainerRef?.current || window;
        target.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const target = scrollContainerRef?.current || window;
        target.addEventListener('scroll', toggleVisibility);
        return () => target.removeEventListener('scroll', toggleVisibility);
    }, [scrollContainerRef]);

    return isVisible ? (
        <button onClick={scrollToTop} className="scroll-to-top">
            <ChevronUp size={24} />
        </button>
    ) : null;
}

export default Layout;

