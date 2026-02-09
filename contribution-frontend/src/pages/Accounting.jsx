import { useState, useEffect } from 'react';
import { accountingAPI, branchAPI } from '../services/api';
import { showSuccess, showError } from '../utils/sweetalert';
import Layout from '../components/Layout';
import '../styles/App.css';

function Accounting() {
    const [expenses, setExpenses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
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
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expRes, branchRes] = await Promise.all([
                accountingAPI.getExpenses(),
                branchAPI.getAll()
            ]);
            setExpenses(expRes.data.data); // Paginated response
            setBranches(branchRes.data);
        } catch (error) {
            console.error('Failed to fetch accounting data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await accountingAPI.createExpense(formData);
            setShowModal(false);
            setFormData({
                category: 'office_supplies', description: '', amount: '',
                expense_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash', branch_id: '', receipt_number: ''
            });
            fetchData();
        } catch (error) {
            console.error('Failed to record expense', error);
            showError('Error recording expense');
        }
    };

    return (
        <div className="accounting-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>Accounting & Expenses</h1>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    + Record Expense
                </button>
            </div>

            <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Date</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Category</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Description</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Branch</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Amount</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No expenses recorded yet.
                                </td>
                            </tr>
                        ) : (
                            expenses.map(expense => (
                                <tr key={expense.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '16px' }}>{new Date(expense.expense_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                                        {expense.category.replace('_', ' ')}
                                    </td>
                                    <td style={{ padding: '16px' }}>{expense.description}</td>
                                    <td style={{ padding: '16px' }}>{expense.branch?.name || 'General'}</td>
                                    <td style={{ padding: '16px', color: 'var(--danger-color)', fontWeight: 'bold' }}>
                                        -₵{parseFloat(expense.amount).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '12px' }}>
                                        {expense.payment_method.replace('_', ' ')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Expense Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Record Expense</h2>
                        <form onSubmit={handleSubmit}>
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
