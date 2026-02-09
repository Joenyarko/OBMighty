import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, cardAPI, branchAPI, userAPI, customerCardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showWarning } from '../utils/sweetalert';
import '../styles/Customers.css';
import '../styles/CustomersTable.css';

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
    const { user, isCEO, isSecretary } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        console.log('Customers.jsx: useEffect triggered', { user });
        if (!user) {
            console.log('Customers.jsx: No user, skipping fetch');
            return;
        }
        fetchCustomers();
        fetchCards();
        if (isCEO() || isSecretary()) {
            fetchBranchesAndWorkers();
        }
    }, [user]);

    // ... fetch functions ...

    const handleDeleteCustomer = async (customerId) => {
        try {
            await customerAPI.delete(customerId);
            setCustomers(customers.filter(c => c.id !== customerId));
            showSuccess('Customer deleted successfully');
        } catch (error) {
            console.error('Failed to delete customer:', error);
            showError('Failed to delete customer');
        }
    };

    const handleUpdateCustomer = async (id, data) => {
        try {
            const response = await customerAPI.update(id, data);
            // Update list without refetching
            setCustomers(customers.map(c => c.id === id ? response.data.customer : c));
            setShowEditForm(false);
            showSuccess('Customer updated successfully');
        } catch (error) {
            console.error('Failed to update customer:', error);
            showError('Failed to update customer');
        }
    };

    // Filter customers based on search
    const filteredCustomers = customers.filter(customer => {
        const query = searchQuery.toLowerCase();
        return (
            customer.name.toLowerCase().includes(query) ||
            customer.phone.includes(query) ||
            (customer.card?.card_code?.toLowerCase().includes(query))
        );
    });

    const fetchCustomers = async () => {
        console.log('Customers.jsx: fetchCustomers called');
        try {
            const response = await customerAPI.getAll();
            console.log('Customers.jsx: fetched data', response.data);
            setCustomers(response.data.data);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            console.log('Customers.jsx: setting loading false');
            setLoading(false);
        }
    };

    const fetchCards = async () => {
        try {
            const response = await cardAPI.getAll();
            setCards(response.data);
        } catch (error) {
            console.error('Failed to fetch cards:', error);
        }
    };

    const fetchBranchesAndWorkers = async () => {
        try {
            const [branchRes, workerRes] = await Promise.all([
                branchAPI.getAll(),
                userAPI.getAll()
            ]);
            setBranches(branchRes.data);
            setWorkers(workerRes.data);
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
            <div className="controls-section">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by name, phone, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddForm(true)}
                >
                    + Add Customer
                </button>
            </div>

            {/* Simple Customer Table */}
            <div className="customers-table-container">
                <table className="customers-table">
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
                        {filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-data">No customers found</td>
                            </tr>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>{customer.name}</td>
                                    <td>{customer.phone}</td>
                                    <td>{customer.location}</td>
                                    <td>{customer.branch?.name || 'N/A'}</td>
                                    <td>{customer.worker?.name || 'N/A'}</td>
                                    <td>{customer.card?.card_name || 'N/A'}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon-small edit"
                                            onClick={() => {
                                                setSelectedCustomer(customer);
                                                setShowEditForm(true);
                                            }}
                                            title="Edit"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn-icon-small delete"
                                            onClick={() => handleDeleteCustomer(customer.id)}
                                            title="Delete"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showAddForm && (
                <AddCustomerModal
                    cards={cards}
                    branches={branches}
                    workers={workers}
                    onClose={() => setShowAddForm(false)}
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

function AddCustomerModal({ cards, branches, workers, onClose, onSubmit }) {
    const { user, isCEO, isSecretary, isWorker } = useAuth();

    // Safety check
    if (!user) return null;

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        location: '',
        card_id: '',
        branch_id: '',
        worker_id: '',
    });
    const [selectedCard, setSelectedCard] = useState(null);

    // Initialize fields based on role
    useEffect(() => {
        if (isWorker()) {
            setFormData(prev => ({
                ...prev,
                branch_id: user.branch_id,
                worker_id: user.id
            }));
        } else if (isSecretary()) {
            setFormData(prev => ({
                ...prev,
                branch_id: user.branch_id,
                worker_id: user.id // Default to self, but can change to other workers in branch
            }));
        } else if (isCEO()) {
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
        onSubmit(formData);
    };

    // Filter workers based on role and selected branch
    const availableWorkers = workers.filter(w => {
        if (isCEO()) {
            // If branch is selected, show workers from that branch AND the CEO themselves
            if (formData.branch_id) {
                return w.branch_id === parseInt(formData.branch_id) || w.id === user.id;
            }
            return true; // Show all if no branch selected
        }
        if (isSecretary()) {
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
                        <label>Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
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
                            disabled={!isCEO()}
                            required
                        >
                            <option value="">Select Branch</option>
                            {isCEO() ? (
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
                            disabled={isWorker()}
                            required
                        >
                            <option value="">Select Worker</option>
                            {isWorker() ? (
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

export default Customers;

