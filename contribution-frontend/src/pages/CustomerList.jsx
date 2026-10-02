import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, userAPI, branchAPI } from '../services/api';
import { showSuccess, showError, showConfirm, showWarning } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext';
import { Search, Trash2, ArrowRightLeft, Eye, Edit, CheckCircle2, AlertTriangle, Clock, Layers, Share2, Copy } from 'lucide-react';
import TransferCustomerModal from '../components/TransferCustomerModal';
import '../styles/CustomerList.css';

function CustomerList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [servedFilter, setServedFilter] = useState('unserved'); // 'served' or 'unserved'
    const [companyLogo, setCompanyLogo] = useState(null);

    const [statusFilter, setStatusFilter] = useState('');
    const [percentageFilter, setPercentageFilter] = useState('');
    const [dueFilter, setDueFilter] = useState('');
    const [workerFilter, setWorkerFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [workers, setWorkers] = useState([]);
    const [branches, setBranches] = useState([]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerToTransfer, setCustomerToTransfer] = useState(null);
    const [shareCustomer, setShareCustomer] = useState(null);
    const [copiedLink, setCopiedLink] = useState(false);

    const getShareUrl = (c) => {
        const origin = window.location.origin;
        return `${origin}/passbook/${c.share_token || c.id}`;
    };

    const handleCopyShareLink = (c) => {
        const url = getShareUrl(c);
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        showSuccess('Passbook link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2500);
    };

    const handleWhatsAppShare = (c) => {
        const url = getShareUrl(c);
        const text = `Hello ${c.name}, here is your live digital passbook for your savings: ${url}`;
        let phone = c.phone || '';
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0') && phone.length === 10) {
            phone = '233' + phone.substring(1);
        }
        const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    };

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        from: 0,
        to: 0,
        stats: { total: 0, in_progress: 0, completed: 0, defaulting: 0, due: 0, served: 0, unserved: 0 }
    });

    const { isCEO, isSecretary, isManager, user } = useAuth();
    const navigate = useNavigate();

    // Fetch company configuration for logo
    useEffect(() => {
        if (user?.company?.logo_url) {
            setCompanyLogo(user.company.logo_url);
        }
    }, [user]);

    useEffect(() => {
        fetchCustomers(1);
        if (isCEO || isSecretary || isManager) {
            fetchFilterOptions();
        }
    }, [statusFilter, percentageFilter, dueFilter, workerFilter, branchFilter, servedFilter]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchFilterOptions = async () => {
        try {
            const [workerRes, branchRes] = await Promise.all([
                userAPI.getAll(),
                branchAPI.getAll()
            ]);

            const workerList = Array.isArray(workerRes.data) ? workerRes.data : (workerRes.data?.data || []);
            if ((isSecretary || isManager) && user?.branch_id) {
                setWorkers(workerList.filter(w => w.branch_id === user.branch_id));
            } else {
                setWorkers(workerList);
            }

            const branchList = Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data?.data || []);
            setBranches(branchList);
        } catch (error) {
            console.error('Failed to load filter options', error);
        }
    };

    const fetchCustomers = async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                page,
                search: searchTerm,
                status: statusFilter,
                percentage: percentageFilter,
                due_filter: dueFilter,
                worker_id: workerFilter,
                branch_id: branchFilter
            };

            // If status is 'completed', apply served filter
            if (statusFilter === 'completed') {
                params.is_served = servedFilter === 'served' ? 'true' : 'false';
            } else if (statusFilter === 'served') {
                params.is_served = 'true';
            }

            // Remove empty params
            Object.keys(params).forEach(key => params[key] === '' && delete params[key]);

            const response = await customerAPI.getAll(params);
            const data = response.data;

            setCustomers(data.data || []);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                total: data.total,
                from: data.from,
                to: data.to,
                stats: data.stats || { total: 0, in_progress: 0, completed: 0, defaulting: 0, served: 0, unserved: 0 }
            });
        } catch (error) {
            showError('Failed to fetch customers');
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.last_page) {
            fetchCustomers(newPage);
        }
    };

    const handleEdit = (customer) => {
        setSelectedCustomer(customer);
        setShowEditModal(true);
    };

    const handleUpdateCustomer = async (id, data) => {
        try {
            const response = await customerAPI.update(id, data);
            setCustomers(customers.map(c => c.id === id ? response.data.customer : c));
            setShowEditModal(false);
            setSelectedCustomer(null);
            showSuccess('Customer updated successfully');
        } catch (error) {
            console.error('Failed to update customer:', error);
            showError('Failed to update customer');
        }
    };

    // 2-Option Deletion Handler (Refund vs Keep without Refund)
    const handleDeleteCustomer = async (customer) => {
        const amountPaid = parseFloat(customer.amount_paid || 0);
        const customerName = customer.name;
        const isDone = customer.status === 'completed' || customer.is_served;

        // If customer has contributed money and is not completed/served
        if (amountPaid > 0 && !isDone) {
            const Swal = (await import('sweetalert2')).default;
            const result = await Swal.fire({
                title: `Delete & Cancel Customer?`,
                html: `
                    <div style="text-align: left; font-size: 14px; color: #d1d5db; line-height: 1.6;">
                        <p style="margin-bottom: 8px;">Customer <strong style="color:#fff;">${customerName}</strong> has paid a total of <strong style="color: #00dfa2;">GHS ${amountPaid.toFixed(2)}</strong> (${customer.boxes_filled}/${customer.total_boxes} boxes).</p>
                        <p style="margin-bottom: 16px; color: #f87171;">Since this customer has not completed their contribution, how should the collected funds be treated?</p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: '💸 Delete & Refund (Reduce Total Sales)',
                denyButtonText: '🔒 Delete Without Refund (Keep in Total Sales)',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#ef4444',
                denyButtonColor: '#f59e0b',
                cancelButtonColor: '#374151',
                background: '#161920',
                color: '#fff',
            });

            if (result.isConfirmed) {
                // Delete with refund
                try {
                    const res = await customerAPI.deactivate(customer.id, { refund: true, delete_type: 'refund' });
                    showSuccess(res.data?.message || 'Customer deleted and payment refunded.');
                    fetchCustomers(pagination.current_page);
                } catch (err) {
                    console.error(err);
                    showError(err.response?.data?.message || 'Failed to delete customer.');
                }
            } else if (result.isDenied) {
                // Delete without refund
                try {
                    const res = await customerAPI.deactivate(customer.id, { refund: false, delete_type: 'no_refund' });
                    showSuccess(res.data?.message || 'Customer deleted without refund.');
                    fetchCustomers(pagination.current_page);
                } catch (err) {
                    console.error(err);
                    showError(err.response?.data?.message || 'Failed to delete customer.');
                }
            }
        } else {
            // Zero balance or already served/completed customer
            const result = await showConfirm(
                `Delete Customer "${customerName}"?`,
                'This customer record will be removed from active lists.',
                'Yes, Delete',
                'Cancel'
            );
            if (result.isConfirmed) {
                try {
                    await customerAPI.deactivate(customer.id, { refund: false });
                    showSuccess('Customer deleted successfully');
                    fetchCustomers(pagination.current_page);
                } catch (err) {
                    console.error(err);
                    showError(err.response?.data?.message || 'Failed to delete customer.');
                }
            }
        }
    };

    const handleMarkAsServed = async (customer) => {
        const result = await showConfirm(
            'Mark as Served?',
            `Are you sure ${customer.name} has been served with their items? This will fulfill their card.`,
            'Yes, Mark Served',
            'Cancel'
        );

        if (result.isConfirmed) {
            try {
                await customerAPI.markServed(customer.id);
                showSuccess('Customer marked as served successfully');
                fetchCustomers(pagination.current_page);
            } catch (error) {
                console.error('Failed to mark as served', error);
                showError(error.response?.data?.message || 'Failed to action');
            }
        }
    };

    return (
        <div className="customer-list-container">
            {/* Header */}
            <div className="page-header">
                <h1>Customer Management</h1>
                <p>View and manage all customer accounts, card tracking, and served fulfillments</p>
            </div>

            {/* Quick Status Tabs */}
            <div className="quick-tabs-container">
                <button 
                    className={`tab-btn ${statusFilter === '' ? 'active' : ''}`}
                    onClick={() => { setStatusFilter(''); setServedFilter('unserved'); }}
                >
                    <Layers size={14} /> All Active ({pagination.stats?.total || 0})
                </button>
                <button 
                    className={`tab-btn ${statusFilter === 'in_progress' ? 'active' : ''}`}
                    onClick={() => { setStatusFilter('in_progress'); setServedFilter('unserved'); }}
                >
                    <Clock size={14} /> In Progress ({pagination.stats?.in_progress || 0})
                </button>
                <button 
                    className={`tab-btn ${statusFilter === 'completed' && servedFilter === 'unserved' ? 'active' : ''}`}
                    onClick={() => { setStatusFilter('completed'); setServedFilter('unserved'); }}
                >
                    <CheckCircle2 size={14} /> Completed Unserved ({pagination.stats?.unserved || 0})
                </button>
                <button 
                    className={`tab-btn highlight-served ${statusFilter === 'served' ? 'active' : ''}`}
                    onClick={() => { setStatusFilter('served'); }}
                >
                    ✓ Served Customers ({pagination.stats?.served || 0})
                </button>
                <button 
                    className={`tab-btn ${statusFilter === 'defaulting' ? 'active' : ''}`}
                    onClick={() => { setStatusFilter('defaulting'); setServedFilter('unserved'); }}
                >
                    <AlertTriangle size={14} /> Defaulting ({pagination.stats?.defaulting || 0})
                </button>
            </div>

            {/* Filter Controls */}
            <div className="controls-section">
                <div className="search-form">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by customer name, phone, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filters-group">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Active Statuses</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed (Unserved)</option>
                        <option value="served">Served Customers (Fulfilled)</option>
                        <option value="defaulting">Defaulting</option>
                        <option value="closed">Closed / Inactive</option>
                    </select>

                    {/* Due Date Filter */}
                    <select
                        value={dueFilter}
                        onChange={(e) => setDueFilter(e.target.value)}
                        className="filter-select due-filter-select"
                    >
                        <option value="">All Due Dates</option>
                        <option value="overdue">⚠️ Due / Overdue</option>
                        <option value="due_this_week">Due This Week</option>
                        <option value="due_this_month">Due This Month</option>
                    </select>

                    {/* Progress Percentage Filter */}
                    <select
                        value={percentageFilter}
                        onChange={(e) => setPercentageFilter(e.target.value)}
                        className="filter-select percentage-filter-select"
                    >
                        <option value="">All Progress (%)</option>
                        <option value="60_plus">60%+ (About to Complete)</option>
                        <option value="70_plus">70%+ (About to Complete)</option>
                        <option value="80_plus">80%+ (Almost Done)</option>
                        <option value="90_plus">90%+ (Near Completion)</option>
                        <option value="100">100% (Completed)</option>
                    </select>

                    {(isCEO || isSecretary || isManager) && (
                        <select
                            value={workerFilter}
                            onChange={(e) => setWorkerFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Workers</option>
                            {workers.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    )}

                    {isCEO && (
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => setStatusFilter('')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Total Customers</h3>
                        <p className="stat-value">{pagination.total}</p>
                    </div>
                </div>
                <div className="stat-card" onClick={() => setStatusFilter('in_progress')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>In Progress</h3>
                        <p className="stat-value">{pagination.stats?.in_progress || 0}</p>
                    </div>
                </div>
                <div className="stat-card" onClick={() => { setStatusFilter('completed'); setServedFilter('unserved'); }} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Completed</h3>
                        <p className="stat-value">{pagination.stats?.completed || 0}</p>
                    </div>
                </div>
                <div className="stat-card" onClick={() => setStatusFilter('served')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">🎁</div>
                    <div className="stat-content">
                        <h3>Served (Fulfilled)</h3>
                        <p className="stat-value" style={{ color: '#00dfa2' }}>{pagination.stats?.served || 0}</p>
                    </div>
                </div>
                <div className="stat-card" onClick={() => setStatusFilter('defaulting')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>Defaulting</h3>
                        <p className="stat-value">{pagination.stats?.defaulting || 0}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading customer data...</p>
                </div>
            ) : customers.length === 0 ? (
                <div className="no-customers">
                    <p>No customers found matching your criteria.</p>
                </div>
            ) : statusFilter === 'served' ? (
                /* SERVED CUSTOMERS TABLE VIEW (Clean Table Format without Card Boxes) */
                <div className="served-table-wrapper">
                    <div className="table-header-info">
                        <h2>🎁 Served Customers List ({customers.length})</h2>
                        <p>All customers whose items have been purchased and fulfilled.</p>
                    </div>
                    <div className="table-scroll">
                        <table className="served-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Card / Item</th>
                                    <th>Fulfilled Amount</th>
                                    <th>Boxes Completed</th>
                                    <th>Worker</th>
                                    <th>Branch</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="customer-name-bold">{c.name}</div>
                                            <div className="customer-sub-info">📞 {c.phone} • 📍 {c.location}</div>
                                        </td>
                                        <td>
                                            <span className="card-name-tag">
                                                {c.card?.card_name || 'Standard Card'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="amount-fulfilled">
                                                GHS {parseFloat(c.amount_paid || c.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="boxes-tag">
                                                {c.boxes_filled || c.total_boxes}/{c.total_boxes} boxes
                                            </span>
                                        </td>
                                        <td>{c.worker?.name || 'N/A'}</td>
                                        <td>{c.branch?.name || 'N/A'}</td>
                                        <td>
                                            <span className="badge-served">
                                                ✓ SERVED
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-action-buttons">
                                                <button
                                                    className="btn-action-view"
                                                    onClick={() => navigate(`/customers/${c.id}/boxes`)}
                                                    title="View Card History"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                                <button
                                                    className="btn-action-view"
                                                    onClick={() => setShareCustomer(c)}
                                                    title="Share Digital Passbook"
                                                    style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25d366', border: '1px solid rgba(37, 211, 102, 0.3)' }}
                                                >
                                                    <Share2 size={14} /> Share
                                                </button>
                                                {(isCEO || isSecretary || isManager) && (
                                                    <button
                                                        className="btn-action-delete"
                                                        onClick={() => handleDeleteCustomer(c)}
                                                        title="Delete Customer Record"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* STANDARD CUSTOMER GRID VIEW */
                <div className="customers-grid">
                    {customers.map((customer) => (
                        <div key={customer.id} className="customer-card">
                            <div className="customer-header">
                                <h3>{customer.name}</h3>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <span className={`status-badge ${customer.status}`}>
                                        {customer.status?.replace('_', ' ')}
                                    </span>
                                    {customer.is_served && (
                                        <span className="status-badge served" style={{ backgroundColor: '#10b981', color: 'white' }}>
                                            Served
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="customer-details">
                                <p><strong>📞 Phone:</strong> {customer.phone}</p>
                                <p><strong>📍 Location:</strong> {customer.location}</p>
                                <p><strong>👷 Worker:</strong> {customer.worker?.name || 'N/A'}</p>
                                <p><strong>🏢 Branch:</strong> {customer.branch?.name || 'N/A'}</p>
                                <p><strong>💳 Card:</strong> {customer.card?.card_name || 'N/A'}</p>
                                
                                {/* Start Date & Due Date */}
                                <div className="card-date-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>📅 Start Date:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {customer.start_date ? new Date(customer.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>⏰ Due Date:</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontWeight: 600, color: customer.is_due ? '#ef4444' : 'var(--text-primary)' }}>
                                                {customer.due_date ? new Date(customer.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                            </span>
                                            {customer.is_due && (
                                                <span className="badge-due">
                                                    DUE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="payment-info">
                                <div className="progress-section">
                                    <div className="progress-label">
                                        <span>Progress: {customer.boxes_filled}/{customer.total_boxes} boxes</span>
                                        <span>{customer.completion_percentage}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${customer.completion_percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <p><strong>Amount Paid:</strong> GHS {parseFloat(customer.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p><strong>Balance:</strong> GHS {parseFloat(customer.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>

                            <div className="customer-actions">
                                <button
                                    className="btn-view-boxes"
                                    onClick={() => navigate(`/customers/${customer.id}/boxes`)}
                                    title="View Boxes"
                                >
                                    📦 View
                                </button>

                                <button
                                    className="btn-icon"
                                    onClick={() => setShareCustomer(customer)}
                                    title="Share Digital Passbook Link"
                                    style={{ color: '#25d366', border: '1px solid rgba(37, 211, 102, 0.3)', padding: '6px', borderRadius: '6px' }}
                                >
                                    <Share2 size={16} />
                                </button>

                                {/* Mark as Served Button - For Completed Unserved customers */}
                                {(isCEO || isSecretary || isManager) &&
                                    customer.status === 'completed' &&
                                    !customer.is_served && (
                                        <button
                                            className="btn-icon serve"
                                            onClick={() => handleMarkAsServed(customer)}
                                            title="Mark as Served"
                                            style={{ color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}
                                        >
                                            ✓ Serve
                                        </button>
                                    )}

                                <button
                                    className="btn-icon edit"
                                    onClick={() => handleEdit(customer)}
                                    title="Edit Customer"
                                >
                                    <Edit size={16} />
                                </button>

                                {(isCEO || isSecretary || isManager) && (
                                    <button
                                        className="btn-icon delete"
                                        onClick={() => handleDeleteCustomer(customer)}
                                        title="Delete Customer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}

                                {/* Transfer Button - CEO, Manager, Secretary */}
                                {(isCEO || isSecretary || isManager) && (
                                    <button
                                        className="btn-icon transfer"
                                        title="Transfer Customer"
                                        style={{ color: 'var(--primary-color)' }}
                                        onClick={() => setCustomerToTransfer(customer)}
                                    >
                                        <ArrowRightLeft size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {pagination.total > 0 && (
                <div className="pagination-controls">
                    <div style={{ color: 'var(--text-secondary)' }}>
                        Showing {pagination.from || 0}–{pagination.to || 0} of {pagination.total} customers
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => handlePageChange(1)}
                            disabled={pagination.current_page === 1}
                            className="btn-secondary"
                            style={{ padding: '6px 12px' }}
                        >
                            First
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.current_page - 1)}
                            disabled={pagination.current_page === 1}
                            className="btn-secondary"
                            style={{ padding: '6px 12px' }}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.current_page + 1)}
                            disabled={pagination.current_page === pagination.last_page}
                            className="btn-secondary"
                            style={{ padding: '6px 12px' }}
                        >
                            Next
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.last_page)}
                            disabled={pagination.current_page === pagination.last_page}
                            className="btn-secondary"
                            style={{ padding: '6px 12px' }}
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedCustomer && (
                <EditCustomerModal
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedCustomer(null);
                    }}
                    onSubmit={handleUpdateCustomer}
                />
            )}

            {/* Transfer Customer Modal */}
            {customerToTransfer && (
                <TransferCustomerModal
                    customer={customerToTransfer}
                    onClose={() => setCustomerToTransfer(null)}
                    onSuccess={fetchCustomers}
                />
            )}

            {/* Share Digital Passbook Modal */}
            {shareCustomer && (
                <div className="modal-overlay" onClick={() => setShareCustomer(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📱 Customer Digital Passbook
                            </h2>
                            <button 
                                onClick={() => setShareCustomer(null)}
                                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '18px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px', lineHeight: 1.5 }}>
                            Share this live, read-only link with <strong>{shareCustomer.name}</strong> so they can view their card progress, boxes, and payments on their phone anytime.
                        </p>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                                type="text"
                                readOnly
                                value={getShareUrl(shareCustomer)}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: '#1a1a1a',
                                    color: '#fff',
                                    fontSize: '13px'
                                }}
                            />
                            <button
                                className="btn-primary"
                                onClick={() => handleCopyShareLink(shareCustomer)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                            >
                                <Copy size={15} />
                                {copiedLink ? 'Copied!' : 'Copy'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => handleWhatsAppShare(shareCustomer)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    background: '#25d366',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <Share2 size={16} /> Send via WhatsApp
                            </button>

                            <button
                                onClick={() => window.open(getShareUrl(shareCustomer), '_blank')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '10px',
                                    background: '#2a2e36',
                                    color: '#fff',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Eye size={16} /> Preview Digital Passbook
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EditCustomerModal({ customer, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        name: customer.name || '',
        phone: customer.phone || '',
        location: customer.location || '',
        start_date: customer.start_date ? customer.start_date.substring(0, 10) : '',
        due_date: customer.due_date ? customer.due_date.substring(0, 10) : '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(customer.id, formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Edit Customer</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Start Date / Date Registered</label>
                        <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => {
                                const newStart = e.target.value;
                                const duration = customer?.card?.duration_months || 6;
                                let newDue = formData.due_date;
                                if (newStart && (!formData.due_date || formData.due_date === '')) {
                                    const d = new Date(newStart);
                                    d.setMonth(d.getMonth() + duration);
                                    newDue = d.toISOString().split('T')[0];
                                }
                                setFormData({ ...formData, start_date: newStart, due_date: newDue });
                            }}
                        />
                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px', fontSize: '11px' }}>
                            Card Duration: {customer?.card?.duration_months || 6} Months (Default)
                        </small>
                    </div>
                    <div className="form-group">
                        <label>Due Date</label>
                        <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Update Customer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CustomerList;
