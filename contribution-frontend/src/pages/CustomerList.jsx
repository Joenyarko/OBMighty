import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI } from '../services/api';
import { showSuccess, showError, showWarning } from '../utils/sweetalert';
import '../styles/CustomerList.css';

function CustomerList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customerAPI.getAll();
            setCustomers(response.data.data || response.data);
        } catch (error) {
            showError('Failed to fetch customers');
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
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

    const filteredCustomers = customers.filter(customer => {
        if (!customer) return false;
        const query = searchQuery.toLowerCase();
        const name = customer.name || '';
        const phone = customer.phone || '';
        const location = customer.location || '';

        return name.toLowerCase().includes(query) ||
            phone.includes(searchQuery) ||
            location.toLowerCase().includes(query);
    });

    if (loading) {
        return <div className="loading">Loading customers...</div>;
    }

    return (
        <div className="customer-list-container">
            <div className="page-header">
                <h1>Customer Management</h1>
                <p>View and manage all customers with box tracking</p>
            </div>

            {/* Search Bar */}
            <div className="controls-section">
                <div className="search-form">
                    <input
                        type="text"
                        placeholder="Search by name, phone, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
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
                {filteredCustomers.length === 0 ? (
                    <div className="no-customers">
                        <p>No customers found matching your search.</p>
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
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
                            </div>
                        </div>
                    ))
                )}
            </div>

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
