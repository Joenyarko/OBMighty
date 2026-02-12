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
    const [statusFilter, setStatusFilter] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerToTransfer, setCustomerToTransfer] = useState(null); // For transfer modal



    const [workerFilter, setWorkerFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [workers, setWorkers] = useState([]);
    const [branches, setBranches] = useState([]);
    const { isCEO, isSecretary, user } = useAuth();
    const navigate = useNavigate();

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        from: 0,
        to: 0
    });

    useEffect(() => {
        fetchCustomers(1);
        if (isCEO || isSecretary) {
            fetchFilterOptions();
        }
    }, [statusFilter, workerFilter, branchFilter, isCEO, isSecretary]);

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



    if (loading) {
        return <div className="loading">Loading customers...</div>;
    }

    return (
        <div className="customer-list-container">
            <div className="page-header">
                <h1>Customer Management</h1>
                <p>View and manage all customers with box tracking</p>
            </div>

            {/* Filter Controls */}
            <div className="controls-section" style={{ gap: '12px', flexWrap: 'wrap' }}>
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
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Total Customers</h3>
                        <p className="stat-value">{customers.length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>In Progress</h3>
                        <p className="stat-value">
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
                                <span className={`status-badge ${customer.status}`}>
                                    {customer.status?.replace('_', ' ')}
                                </span>
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

function EditCustomerModal({ customer, onClose, onSubmit }) {
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
