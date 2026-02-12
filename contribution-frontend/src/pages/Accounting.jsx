import { useState, useEffect } from 'react';
import { accountingAPI, branchAPI } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import '../styles/App.css';

function Accounting() {
    const [activeTab, setActiveTab] = useState('expenses'); // expenses, ledger, summary
    const [expenses, setExpenses] = useState([]);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Date filters for ledger/summary
    const [dateFilter, setDateFilter] = useState({
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });

    const [formData, setFormData] = useState({
        category: 'office_supplies',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        branch_id: '',
        receipt_number: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeTab === 'ledger') fetchLedger();
        if (activeTab === 'summary') fetchSummary();
    }, [activeTab, dateFilter]);

    const fetchInitialData = async () => {
        try {
            const [expRes, branchRes] = await Promise.all([
                accountingAPI.getExpenses(),
                branchAPI.getAll()
            ]);
            setExpenses(expRes.data.data);
            setBranches(branchRes.data);
        } catch (error) {
            console.error('Failed to fetch accounting data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const response = await accountingAPI.getLedger(dateFilter);
            setLedgerEntries(response.data.data);
        } catch (error) {
            console.error('Failed to fetch ledger', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const response = await accountingAPI.getSummary(dateFilter);
            setSummary(response.data);
        } catch (error) {
            console.error('Failed to fetch summary', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const confirmed = await showConfirm(
            `Are you sure you want to record this expense of ₵${formData.amount}?`,
            'Confirm Expense'
        );

        if (!confirmed.isConfirmed) return;

        try {
            await accountingAPI.createExpense(formData);
            setShowModal(false);
            setFormData({
                category: 'office_supplies', description: '', amount: '',
                expense_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash', branch_id: '', receipt_number: ''
            });
            fetchInitialData(); // Refresh expenses
            if (activeTab === 'ledger') fetchLedger();
            if (activeTab === 'summary') fetchSummary();
            showSuccess('Expense recorded successfully');
        } catch (error) {
            console.error('Failed to record expense', error);
            showError('Error recording expense');
        }
    };

    return (
        <div className="accounting-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h1 style={{ color: 'var(--primary-color)', margin: 0 }}>Accounting & Finance</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        + Record Expense
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                {['expenses', 'ledger', 'summary'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '12px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                            color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: '500',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Date Filter for Ledger/Summary */}
            {activeTab !== 'expenses' && (
                <div className="filters-card" style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Start Date</label>
                        <input
                            type="date"
                            value={dateFilter.start_date}
                            onChange={e => setDateFilter({ ...dateFilter, start_date: e.target.value })}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', display: 'block' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>End Date</label>
                        <input
                            type="date"
                            value={dateFilter.end_date}
                            onChange={e => setDateFilter({ ...dateFilter, end_date: e.target.value })}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', display: 'block' }}
                        />
                    </div>
                </div>
            )}

            {/* EXPENSES TAB */}
            {activeTab === 'expenses' && (
                <div className="table-container">
                    <table className="mobile-card-view">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Branch</th>
                                <th>Amount</th>
                                <th>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length === 0 ? (
                                <tr><td colSpan="6" className="no-data">No expenses recorded yet.</td></tr>
                            ) : (
                                expenses.map(expense => (
                                    <tr key={expense.id}>
                                        <td data-label="Date">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                        <td data-label="Category" style={{ textTransform: 'capitalize' }}>{expense.category?.replace(/_/g, ' ') || 'Unknown'}</td>
                                        <td data-label="Description">{expense.description}</td>
                                        <td data-label="Branch">{expense.branch?.name || 'General'}</td>
                                        <td data-label="Amount" style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>-₵{parseFloat(expense.amount).toFixed(2)}</td>
                                        <td data-label="Method">{expense.payment_method.replace(/_/g, ' ')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* LEDGER TAB */}
            {activeTab === 'ledger' && (
                <div className="table-container">
                    <table className="mobile-card-view">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Debit (Out)</th>
                                <th>Credit (In)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                            ) : ledgerEntries.length === 0 ? (
                                <tr><td colSpan="5" className="no-data">No records found for this period.</td></tr>
                            ) : (
                                ledgerEntries.map(entry => (
                                    <tr key={entry.id}>
                                        <td data-label="Date">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                        <td data-label="Type">
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                                                background: entry.account_type === 'income' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                color: entry.account_type === 'income' ? '#4caf50' : '#f44336'
                                            }}>
                                                {entry.account_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td data-label="Description">{entry.description}</td>
                                        <td data-label="Debit" style={{ color: entry.debit > 0 ? 'var(--danger-color)' : 'inherit' }}>
                                            {entry.debit > 0 ? `₵${parseFloat(entry.debit).toFixed(2)}` : '-'}
                                        </td>
                                        <td data-label="Credit" style={{ color: entry.credit > 0 ? 'var(--success-color)' : 'inherit' }}>
                                            {entry.credit > 0 ? `₵${parseFloat(entry.credit).toFixed(2)}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SUMMARY TAB */}
            {activeTab === 'summary' && summary && (
                <div className="summary-dashboard">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                        <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', borderLeft: '4px solid #4caf50' }}>
                            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Income</h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>₵{parseFloat(summary.total_income).toFixed(2)}</p>
                        </div>
                        <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', borderLeft: '4px solid #f44336' }}>
                            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Expenses</h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>₵{parseFloat(summary.total_expenses).toFixed(2)}</p>
                        </div>
                        <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', borderLeft: '4px solid #2196f3' }}>
                            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Net Profit</h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: summary.net_profit >= 0 ? '#2196f3' : '#f44336' }}>
                                ₵{parseFloat(summary.net_profit).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Modal - Same as before */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Record Expense</h2>
                        <form onSubmit={handleSubmit}>
                            {/* ... Form fields consistent with previous implementation ... */}
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" value={formData.expense_date} onChange={e => setFormData({ ...formData, expense_date: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option value="office_supplies">Office Supplies</option>
                                    <option value="utilities">Utilities</option>
                                    <option value="rent">Rent</option>
                                    <option value="salaries">Salaries</option>
                                    <option value="transport">Transport</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Amount (₵)</label>
                                <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required min="0" step="0.01" />
                            </div>
                            <div className="form-group">
                                <label>Branch (Optional)</label>
                                <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })}>
                                    <option value="">General (Head Office)</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}>
                                    <option value="cash">Cash</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Accounting;
