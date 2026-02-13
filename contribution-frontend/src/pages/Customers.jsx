import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, cardAPI, branchAPI, userAPI, customerCardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/sweetalert';
import '../styles/Customers.css';


function Customers() {
    const [customers, setCustomers] = useState([]);
    const [cards, setCards] = useState([]);
    const [branches, setBranches] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [preSelectedCardId, setPreSelectedCardId] = useState(null);
    const { user, isCEO, isSecretary } = useAuth();
    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        branch_id: '',
        worker_id: '',
        status: ''
    });

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        from: 0,
        to: 0
    });

    useEffect(() => {
        // console.log('Customers.jsx: useEffect triggered', { user });
        if (!user) return;

        fetchCustomers(1);
        fetchCards();
        if (isCEO || isSecretary) {
            fetchBranchesAndWorkers();
        }
    }, [user, filters]); // Added filters dependency

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user) fetchCustomers(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ... fetch functions ...

    const handleDeleteCustomer = async (customerId) => {
        // ... (unchanged)
    };

    // ... (handleUpdateCustomer unchanged)
    const handleUpdateCustomer = async (id, formData) => {
        try {
            await customerAPI.update(id, formData);
            fetchCustomers(pagination.current_page);
            setShowEditForm(false);
            setSelectedCustomer(null);
            showSuccess('Customer updated successfully');
        } catch (error) {
            console.error('Failed to update customer:', error);
            showError('Failed to update customer');
        }
    };

    // Filter customers based on search (Client-side search removed in favor of Server-side)


    const fetchCustomers = async (page = 1) => {
        setLoading(true);
        try {
            // Remove empty filters
            const params = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '')
            );

            // Add search and page params
            if (searchQuery) params.search = searchQuery;
            params.page = page;

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
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.last_page) {
            fetchCustomers(newPage);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            branch_id: '',
            worker_id: '',
            status: ''
        });
        setSearchQuery('');
    };

    const fetchCards = async () => {
        try {
            // Fetch all active cards (or first page for now, since controller is paginated)
            const response = await cardAPI.getAll();
            // Handle paginated response (response.data.data) or flat array (response.data)
            const cardsData = response.data.data ? response.data.data : response.data;
            setCards(Array.isArray(cardsData) ? cardsData : []);
        } catch (error) {
            console.error('Failed to fetch cards', error);
        }
    };

    const fetchBranchesAndWorkers = async () => {
        // ... (unchanged)
        try {
            const [branchRes, workerRes] = await Promise.all([
                branchAPI.getAll(),
                userAPI.getAll()
            ]);
            // Extract data correctly
            const workerList = Array.isArray(workerRes.data) ? workerRes.data : (workerRes.data?.data || []);
            // Filter workers to actually be workers (optional but good UI)
            setWorkers(workerList);

            const branchList = Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data?.data || []);
            setBranches(branchList);
        } catch (error) {
            console.error('Failed to fetch branches/workers:', error);
        }
    };

    const handleAddCustomer = async (formData) => {
        try {
            await customerAPI.create(formData);
            fetchCustomers();
            setShowAddForm(false);
            showSuccess('Customer created successfully');
        } catch (error) {
            console.error('Failed to add customer:', error);
            showError('Failed to add customer');
        }
    };

    const handleRecordPayment = async (paymentData) => {
        try {
            if (!selectedCustomer) return;

            // 1. Get Active Card for this customer
            // We need to fetch it first because we need the customer_card_id, not just customer_id
            let cardId = null;
            try {
                const cardRes = await customerCardAPI.getCard(selectedCustomer.id);
                cardId = cardRes.data.id;
            } catch (err) {
                // If 404, it means no active card
                showError('No active card found for this customer. Cannot record payment.');
                return;
            }

            // 2. Prepare payload for check-boxes
            const payload = {
                amount_paid: parseFloat(paymentData.payment_amount),
                payment_method: paymentData.payment_method,
                notes: paymentData.notes
                // We don't send boxes_to_check, backend calculates it from amount
            };

            // 3. Call check-boxes endpoint
            await customerCardAPI.checkBoxes(cardId, payload);

            setShowPaymentForm(false);
            fetchCustomers();
            showSuccess('Payment recorded and boxes updated successfully');
        } catch (error) {
            console.error('Failed to record payment:', error);
            showError(error.response?.data?.message || 'Failed to record payment');
        }
    };

    if (loading) {
        return <div className="loading">Loading Customers Page... Please wait.</div>;
    }

    return (
        <div className="customers-page">
            <div className="page-header">
                <h1>Add Customer</h1>
                <p>Add, edit, and manage customer information</p>
            </div>

            {/* Search and Add Section */}
            <div className="controls-section" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--card-bg)', padding: '16px', borderRadius: '12px' }}>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search by name, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                        style={{ flex: 1, minWidth: '200px' }}
                    />



                    <button
                        onClick={clearFilters}
                        className="btn-secondary"
                        style={{ padding: '8px 12px' }}
                    >
                        Clear
                    </button>

                    <button
                        className="btn-primary"
                        onClick={() => setShowAddForm(true)}
                        style={{ marginLeft: 'auto' }}
                    >
                        + Add Customer
                    </button>
                </div>
            </div>

            {/* Simple Customer Table */}
            <div className="table-container">
                <table className="customers-table mobile-card-view">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Location</th>
                            <th>Branch</th>
                            <th>Worker</th>
                            <th>Card</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-data">No customers found</td>
                            </tr>
                        ) : (
                            customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td data-label="Name" style={{ fontWeight: '500' }}>{customer.name}</td>
                                    <td data-label="Phone">{customer.phone}</td>
                                    <td data-label="Location">{customer.location}</td>
                                    <td data-label="Branch">{customer.branch?.name || 'N/A'}</td>
                                    <td data-label="Worker">{customer.worker?.name || 'N/A'}</td>
                                    <td data-label="Card">{customer.card?.card_name || 'N/A'}</td>
                                    <td data-label="Actions" className="actions-cell">
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn-icon-small edit"
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setShowEditForm(true);
                                                }}
                                                title="Edit"
                                                style={{ padding: '8px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon-small delete"
                                                onClick={() => {
                                                    showConfirm('Are you sure you want to delete this customer?', 'Delete Customer').then((result) => {
                                                        if (result.isConfirmed) {
                                                            handleDeleteCustomer(customer.id);
                                                        }
                                                    });
                                                }}
                                                title="Delete"
                                                style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

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
            </div>

            {/* Available Cards Grid */}
            <div className="available-cards-section" style={{ marginTop: '40px' }}>
                <h2>Available Cards</h2>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Click on a card to add a new customer with that card pre-selected.</p>

                <div className="card-selection-grid">
                    {cards.map(card => (
                        <div
                            key={card.id}
                            className="card-selection-item"
                            onClick={() => {
                                setPreSelectedCardId(card.id);
                                setShowAddForm(true);
                            }}
                        >
                            {card.front_image_url ? (
                                <img
                                    src={card.front_image_url}
                                    alt={card.card_name}
                                    className="card-item-image"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div className="card-item-placeholder" style={{ display: card.front_image_url ? 'none' : 'flex' }}>
                                💳
                            </div>

                            <div className="card-item-content">
                                <h4 className="card-item-title">{card.card_name}</h4>
                                <span className="card-item-code">{card.card_code}</span>

                                <div className="card-item-stats">
                                    <div className="card-stat-box">
                                        <span className="card-stat-label">Price</span>
                                        <span className="card-stat-value">GHS{card.amount}</span>
                                    </div>
                                    <div className="card-stat-box">
                                        <span className="card-stat-label">Boxes</span>
                                        <span className="card-stat-value">{card.number_of_boxes}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showAddForm && (
                <AddCustomerModal
                    cards={cards}
                    branches={branches}
                    workers={workers}
                    preSelectedCardId={preSelectedCardId}
                    onClose={() => {
                        setShowAddForm(false);
                        setPreSelectedCardId(null);
                    }}
                    onSubmit={handleAddCustomer}
                />
            )}

            {showEditForm && selectedCustomer && (
                <EditCustomerModal
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowEditForm(false);
                        setSelectedCustomer(null);
                    }}
                    onSubmit={handleUpdateCustomer}
                />
            )}
        </div>
    );
}

function AddCustomerModal({ cards, branches, workers, onClose, onSubmit, preSelectedCardId }) {
    const { user, isCEO, isSecretary, isWorker } = useAuth();

    // Safety check
    if (!user) return null;

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        location: '',
        card_id: preSelectedCardId || '',
        branch_id: '',
        worker_id: '',
    });
    const [selectedCard, setSelectedCard] = useState(null);

    // Initialize fields based on role
    useEffect(() => {
        if (preSelectedCardId && cards.length > 0) {
            const card = cards.find(c => c.id === parseInt(preSelectedCardId));
            if (card) {
                setSelectedCard(card);
            }
        }
    }, [preSelectedCardId, cards]);

    useEffect(() => {
        if (isWorker) {
            setFormData(prev => ({
                ...prev,
                branch_id: user.branch_id,
                worker_id: user.id
            }));
        } else if (isSecretary) {
            setFormData(prev => ({
                ...prev,
                branch_id: user.branch_id,
                worker_id: user.id // Default to self, but can change to other workers in branch
            }));
        } else if (isCEO) {
            // For CEO, initially set to their own branch/id if available, but allow change
            setFormData(prev => ({
                ...prev,
                branch_id: user.branch_id || '',
                worker_id: user.id || ''
            }));
        }
    }, [user]);

    const handleCardChange = (e) => {
        const cardId = e.target.value;
        const card = cards.find(c => c.id === parseInt(cardId));
        setFormData({ ...formData, card_id: cardId });
        setSelectedCard(card);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Phone Validation (Exactly 10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(formData.phone)) {
            showError('Phone number must be exactly 10 digits.');
            return;
        }

        onSubmit(formData);
    };

    // Filter workers based on role and selected branch
    const availableWorkers = workers.filter(w => {
        if (isCEO) {
            // If branch is selected, show workers from that branch AND the CEO themselves
            if (formData.branch_id) {
                return w.branch_id === parseInt(formData.branch_id) || w.id === user.id;
            }
            return true; // Show all if no branch selected
        }
        if (isSecretary) {
            return w.branch_id === user.branch_id;
        }
        return w.id === user.id; // Worker only sees themselves
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Add New Customer</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>2. Customer Details</label>
                    </div>
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone (10 digits)</label>
                        <input
                            type="tel"
                            placeholder="e.g. 0244123456"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            pattern="[0-9]{10}"
                            title="Phone number must be exactly 10 digits"
                        />
                    </div>

                    <div className="form-group">
                        <label>Location</label>
                        <textarea
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                        />
                    </div>

                    {/* Branch Selection - Only for CEO */}
                    <div className="form-group">
                        <label>Branch</label>
                        <select
                            value={formData.branch_id}
                            onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                            disabled={!isCEO}
                            required
                        >
                            <option value="">Select Branch</option>
                            {isCEO ? (
                                branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))
                            ) : (
                                <option value={user.branch_id}>
                                    {branches.find(b => b.id === user.branch_id)?.name || 'My Branch'}
                                </option>
                            )}
                        </select>
                    </div>

                    {/* Worker Selection */}
                    <div className="form-group">
                        <label>Worker</label>
                        <select
                            value={formData.worker_id}
                            onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                            disabled={isWorker}
                            required
                        >
                            <option value="">Select Worker</option>
                            {isWorker ? (
                                <option value={user.id}>{user.name} (Me)</option>
                            ) : (
                                availableWorkers.map(worker => (
                                    <option key={worker.id} value={worker.id}>
                                        {worker.name} ({worker.roles?.[0]?.name || worker.roles?.[0] || 'Worker'})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Card</label>
                        <select
                            value={formData.card_id}
                            onChange={handleCardChange}
                            required
                        >
                            <option value="">Select a card</option>
                            {cards.map((card) => {
                                const boxPrice = card.number_of_boxes > 0
                                    ? (parseFloat(card.amount) / card.number_of_boxes).toFixed(2)
                                    : '0.00';
                                return (
                                    <option key={card.id} value={card.id}>
                                        {card.card_name} ({card.card_code}) - {card.number_of_boxes} boxes @ GHS{boxPrice}/box
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {selectedCard && (
                        <div className="card-preview">
                            <h4>Card Details:</h4>
                            {selectedCard.front_image_url && (
                                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                                    <img
                                        src={selectedCard.front_image_url}
                                        alt={selectedCard.card_name}
                                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                            )}
                            <p><strong>Name:</strong> {selectedCard.card_name}</p>
                            <p><strong>Code:</strong> {selectedCard.card_code}</p>
                            <p><strong>Total Boxes:</strong> {selectedCard.number_of_boxes}</p>
                            <p><strong>Total Amount:</strong> GHS{parseFloat(selectedCard.amount).toFixed(2)}</p>
                            <p><strong>Per Box:</strong> GHS{selectedCard.number_of_boxes > 0 ? (parseFloat(selectedCard.amount) / selectedCard.number_of_boxes).toFixed(2) : '0.00'}</p>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Add Customer
                        </button>
                    </div>
                </form>
            </div>
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

        // Phone Validation (Exactly 10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(formData.phone)) {
            showError('Phone number must be exactly 10 digits.');
            return;
        }

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
                        <label>Phone Number (10 digits)</label>
                        <input
                            type="text"
                            placeholder="e.g. 0244123456"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            pattern="[0-9]{10}"
                            title="Phone number must be exactly 10 digits"
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

export default Customers;

