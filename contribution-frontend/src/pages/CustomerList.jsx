import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, userAPI, branchAPI } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Filter, Edit, Trash2, ArrowRightLeft } from 'lucide-react';
import TransferCustomerModal from '../components/TransferCustomerModal';
import '../styles/CustomerList.css';

function CustomerList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [servedFilter, setServedFilter] = useState('unserved'); // 'served' or 'unserved'
    const [companyLogo, setCompanyLogo] = useState(null);

    const [statusFilter, setStatusFilter] = useState('');
    const [workerFilter, setWorkerFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [workers, setWorkers] = useState([]);
    const [branches, setBranches] = useState([]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerToTransfer, setCustomerToTransfer] = useState(null);

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        from: 0,
        to: 0
    });

    const { isCEO, isSecretary, user } = useAuth();
    const navigate = useNavigate();

    // Fetch company configuration for logo
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // Assuming there's an API to get company config or just use the user context if available
                // For now, let's try to get it from a public config or similar, but since we are authenticated,
                // we might have it in the user object or need to fetch it.
                // Let's assume the user object has the company logo or we fetch it.
                // If not, we might need a specific endpoint. 
                // Let's use the layout's logo logic pattern if possible, but for now 
                // let's assume we can get it from the user.company.logo_url if joined, 
                // or fetch from /config endpoint if global.
                // Actually, the user object from useAuth might have it.
                if (user?.company?.logo_url) {
                    setCompanyLogo(user.company.logo_url);
                } else if (user?.company_id) {
                    // Try to construct it or leave it null.
                    // A safe bet is to assume it's available via a standard path if we knew it.
                    // But we can try to fetch the company details if needed.
                }
            } catch (err) {
                console.error("Failed to fetch logo", err);
            }
        };
        fetchConfig();
    }, [user]);

    useEffect(() => {
        fetchCustomers(1);
        if (isCEO || isSecretary) {
            fetchFilterOptions();
        }
    }, [statusFilter, workerFilter, branchFilter, isCEO, isSecretary, servedFilter]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchFilterOptions = async () => {
        try {
            const [workerRes, branchRes] = await Promise.all([
                userAPI.getAll(),
                branchAPI.getAll()
            ]);

            const workerList = Array.isArray(workerRes.data) ? workerRes.data : (workerRes.data?.data || []);
            // Filter workers if secretary (Use function result)
            if (isSecretary && user) {
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
                worker_id: workerFilter,
                branch_id: branchFilter
            };

            // If status is 'completed', apply served filter
            if (statusFilter === 'completed') {
                params.is_served = servedFilter === 'served' ? 'true' : 'false';
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
                to: data.to
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

    const handleDelete = async (id) => {
        const result = await showWarning(
            'Are you sure you want to delete this customer?',
            'This action cannot be undone.',
            'Yes, delete it!'
        );

        if (result.isConfirmed) {
            try {
                await customerAPI.delete(id);
                setCustomers(customers.filter(c => c.id !== id));
                showSuccess('Customer deleted successfully');
            } catch (error) {
                console.error('Failed to delete customer:', error);
                showError('Failed to delete customer');
            }
        }
    };

    const handleMarkAsServed = async (customer) => {
        // Confirmation with Logo
        const result = await showConfirm(
            'Mark as Served?',
            `Are you sure ${customer.name} has been served?`,
            'Yes, Mark Served',
            companyLogo // Pass logo URL if available (SweetAlert customization might be needed in utils)
        );

        if (result.isConfirmed) {
            try {
                await customerAPI.markServed(customer.id);
                showSuccess('Customer marked as served');
                fetchCustomers(pagination.current_page); // Refresh list
            } catch (error) {
                console.error('Failed to mark as served', error);
                showError(error.response?.data?.message || 'Failed to action');
            }
        }
    };

    // ... (rest of the file until return)

    return (
        <div className="customer-list-container">
            {/* ... (Header) */}
            <div className="page-header">
                <h1>Customer Management</h1>
                <p>View and manage all customers with box tracking</p>
            </div>

            {/* Filter Controls */}
            <div className="controls-section" style={{ gap: '12px', flexWrap: 'wrap' }}>
                {/* ... (Search and other filters) */}
                <div className="search-form" style={{ flex: 1, minWidth: '200px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                        style={{ paddingLeft: '36px', width: '100%' }}
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Statuses</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="defaulting">Defaulting</option>
                </select>

                {/* Sub-filter for Completed status */}
                {statusFilter === 'completed' && (
                    <div className="served-toggle">
                        <button
                            className={`toggle-btn ${servedFilter === 'unserved' ? 'active' : ''}`}
                            onClick={() => setServedFilter('unserved')}
                        >
                            Unserved
                        </button>
                        <button
                            className={`toggle-btn ${servedFilter === 'served' ? 'active' : ''}`}
                            onClick={() => setServedFilter('served')}
                        >
                            Served
                        </button>
                    </div>
                )}


                {(isCEO || isSecretary) && (
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

            {/* Customer Stats */}
            {/* ... (Stats grid unchanged) */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Total Customers</h3>
                        <p className="stat-value">{customers.length}</p>
                    </div>
                </div>
                {/* Remove or adjust stats if needed based on served/unserved view? 
                    The user didn't explicitly ask for served/unserved *stats* here, 
                    but the list should update. Let's keep general stats for now. */}
                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>In Progress</h3>
                        <p className="stat-value">
                            {/* Note: This count is only accurate if we fetch all or separate stats endpoint. 
                                Currently it filters the *current page* or *fetched list*. 
                                Ideally stats should come from a report endpoint. 
                                For now, we leave as is, acknowledging it counts from the current view list 
                                which might be paginated. The previous implementation had this limitation too. 
                            */}
                            {customers.filter(c => c.status === 'in_progress').length}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Completed</h3>
                        <p className="stat-value">
                            {customers.filter(c => c.status === 'completed').length}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>Defaulting</h3>
                        <p className="stat-value">
                            {customers.filter(c => c.status === 'defaulting').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Customer List */}
            <div className="customers-grid">
                {customers.length === 0 ? (
                    <div className="no-customers">
                        <p>No customers found matching your search.</p>
                    </div>
                ) : (
                    customers.map((customer) => (
                        <div key={customer.id} className="customer-card">
                            <div className="customer-header">
                                <h3>{customer.name}</h3>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <span className={`status-badge ${customer.status}`}>
                                        {customer.status?.replace('_', ' ')}
                                    </span>
                                    {customer.is_served && (
                                        <span className="status-badge served" style={{ backgroundColor: '#2ecc71', color: 'white' }}>
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
                                <p><strong>Amount Paid:</strong> GHS{customer.amount_paid}</p>
                                <p><strong>Balance:</strong> GHS{customer.balance}</p>
                            </div>

                            <div className="customer-actions">
                                <button
                                    className="btn-view-boxes"
                                    onClick={() => navigate(`/customers/${customer.id}/boxes`)}
                                    title="View Boxes"
                                >
                                    📦 View
                                </button>

                                {/* Mark as Served Button - Only for Completed Defaulting/Completed Unserved customers */}
                                {(isCEO || isSecretary) &&
                                    customer.status === 'completed' &&
                                    !customer.is_served && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleMarkAsServed(customer)}
                                            title="Mark as Served"
                                            style={{ color: '#27ae60' }}
                                        >
                                            ✓ Serve
                                        </button>
                                    )}

                                <button
                                    className="btn-icon edit"
                                    onClick={() => handleEdit(customer)}
                                    title="Edit Customer"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    className="btn-icon delete"
                                    onClick={() => handleDelete(customer.id)}
                                    title="Delete Customer"
                                >
                                    🗑️ Delete
                                </button>
                                {/* Transfer Button - CEO Only */}
                                {isCEO && (
                                    <button
                                        className="btn-icon"
                                        title="Transfer"
                                        style={{ color: 'var(--primary-color)' }}
                                        onClick={() => setCustomerToTransfer(customer)}
                                    >
                                        <ArrowRightLeft size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {/* ... (Pagination unchanged) */}
            {pagination.total > 0 && (
                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px', background: 'var(--card-bg)', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                        Showing {pagination.from}–{pagination.to} of {pagination.total} customers
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
        </div>
    );
}

// ... (EditCustomerModal unchanged)
function EditCustomerModal({ customer, onClose, onSubmit }) {
    // ... (rest of EditCustomerModal)
    const [formData, setFormData] = useState({
        name: customer.name,
        phone: customer.phone,
        location: customer.location,
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
