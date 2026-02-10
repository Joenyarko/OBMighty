import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import '../styles/Payroll.css';

// Payroll API
const payrollAPI = {
    getEmployees: () => api.get('/payroll/employees'),
    getEmployeeDetails: (id) => api.get(`/payroll/employees/${id}`),
    setSalary: (data) => api.post('/payroll/salaries', data),
    getRecords: (params) => api.get('/payroll/records', { params }),
    recordPayment: (data) => api.post('/payroll/records', data),
    getMonthlySummary: (month) => api.get(`/payroll/summary/${month}`),
    getUnpaidEmployees: (month) => api.get(`/payroll/unpaid/${month}`),
};

function Payroll() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Form data
    const [salaryForm, setSalaryForm] = useState({
        monthly_salary: '',
        allowances: '',
        deductions: '',
        effective_from: new Date().toISOString().split('T')[0],
    });

    const [paymentForm, setPaymentForm] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: '',
    });

    useEffect(() => {
        fetchData();
    }, [currentMonth]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [employeesRes, summaryRes] = await Promise.all([
                payrollAPI.getEmployees(),
                payrollAPI.getMonthlySummary(currentMonth),
            ]);

            // Check payment status for each employee
            const employeesWithStatus = await Promise.all(
                employeesRes.data.map(async (emp) => {
                    const records = await payrollAPI.getRecords({
                        user_id: emp.id,
                        month: currentMonth,
                        status: 'paid',
                    });
                    return {
                        ...emp,
                        isPaid: records.data.data && records.data.data.length > 0,
                    };
                })
            );

            setEmployees(employeesWithStatus);
            setSummary(summaryRes.data);
        } catch (error) {
            showError('Failed to load payroll data');
        } finally {
            setLoading(false);
        }
    };

    const handleSetSalary = async (e) => {
        e.preventDefault();
        try {
            await payrollAPI.setSalary({
                user_id: selectedEmployee.id,
                ...salaryForm,
            });
            showSuccess('Salary configuration updated successfully!');
            setShowSalaryModal(false);
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to set salary');
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await payrollAPI.recordPayment({
                user_id: selectedEmployee.id,
                payment_month: currentMonth + '-01',
                ...paymentForm,
            });
            showSuccess('Payment recorded successfully!');
            setShowPaymentModal(false);
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to record payment');
        }
    };

    const openSalaryModal = (employee) => {
        setSelectedEmployee(employee);
        if (employee.salary) {
            setSalaryForm({
                monthly_salary: employee.salary.monthly_salary,
                allowances: employee.salary.allowances || '',
                deductions: employee.salary.deductions || '',
                effective_from: new Date().toISOString().split('T')[0],
            });
        } else {
            setSalaryForm({
                monthly_salary: '',
                allowances: '',
                deductions: '',
                effective_from: new Date().toISOString().split('T')[0],
            });
        }
        setShowSalaryModal(true);
    };

    const openPaymentModal = (employee) => {
        setSelectedEmployee(employee);
        setPaymentForm({
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'bank_transfer',
            reference_number: '',
            notes: '',
        });
        setShowPaymentModal(true);
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'paid' && emp.isPaid) ||
            (filterStatus === 'unpaid' && !emp.isPaid);
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return <div className="loading">Loading payroll data...</div>;
    }

    return (
        <div className="payroll-page">
            {/* Header */}
            <div className="page-header">
                <h1>💰 Payroll Management</h1>
                <div className="month-selector">
                    <input
                        type="month"
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(e.target.value)}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <div className="card-icon">👥</div>
                        <div className="card-content">
                            <div className="card-label">Total Employees</div>
                            <div className="card-value">{summary.total_employees}</div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="card-icon">💵</div>
                        <div className="card-content">
                            <div className="card-label">Expected Payroll</div>
                            <div className="card-value">₵{summary.expected_payroll}</div>
                        </div>
                    </div>
                    <div className="summary-card success">
                        <div className="card-icon">✅</div>
                        <div className="card-content">
                            <div className="card-label">Paid Employees</div>
                            <div className="card-value">{summary.paid_employees}</div>
                        </div>
                    </div>
                    <div className="summary-card danger">
                        <div className="card-icon">⏳</div>
                        <div className="card-content">
                            <div className="card-label">Unpaid Employees</div>
                            <div className="card-value">{summary.unpaid_employees}</div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="card-icon">💰</div>
                        <div className="card-content">
                            <div className="card-label">Total Paid</div>
                            <div className="card-value">₵{summary.total_paid}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters">
                <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="filter-tabs">
                    <button
                        className={filterStatus === 'all' ? 'active' : ''}
                        onClick={() => setFilterStatus('all')}
                    >
                        All
                    </button>
                    <button
                        className={filterStatus === 'paid' ? 'active' : ''}
                        onClick={() => setFilterStatus('paid')}
                    >
                        Paid
                    </button>
                    <button
                        className={filterStatus === 'unpaid' ? 'active' : ''}
                        onClick={() => setFilterStatus('unpaid')}
                    >
                        Unpaid
                    </button>
                </div>
            </div>

            {/* Employee Table */}
            <div className="table-container">
                <table className="mobile-card-view">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Branch</th>
                            <th>Monthly Salary</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map(employee => (
                            <tr key={employee.id}>
                                <td data-label="Name">{employee.name}</td>
                                <td data-label="Role" style={{ textTransform: 'capitalize' }}>{employee.role}</td>
                                <td data-label="Branch">{employee.branch}</td>
                                <td data-label="Monthly Salary">
                                    {employee.salary ? (
                                        <span className="salary-amount">
                                            ₵{parseFloat(employee.salary.total_compensation).toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="no-salary">Not Set</span>
                                    )}
                                </td>
                                <td data-label="Status">
                                    <span className={`status-badge ${employee.isPaid ? 'paid' : 'unpaid'}`}>
                                        {employee.isPaid ? 'Paid' : 'Unpaid'}
                                    </span>
                                </td>
                                <td data-label="Actions">
                                    <div className="action-buttons">
                                        <button
                                            className="btn-small btn-secondary"
                                            onClick={() => openSalaryModal(employee)}
                                        >
                                            Set Salary
                                        </button>
                                        {!employee.isPaid && employee.salary && (
                                            <button
                                                className="btn-small btn-primary"
                                                onClick={() => openPaymentModal(employee)}
                                            >
                                                Record Payment
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Set Salary Modal */}
            {showSalaryModal && (
                <div className="modal-overlay" onClick={() => setShowSalaryModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Set Salary - {selectedEmployee?.name}</h2>
                        <form onSubmit={handleSetSalary}>
                            <div className="form-group">
                                <label>Monthly Salary (₵)</label>
                                <input
                                    type="number"
                                    value={salaryForm.monthly_salary}
                                    onChange={(e) => setSalaryForm({ ...salaryForm, monthly_salary: e.target.value })}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label>Allowances (₵)</label>
                                <input
                                    type="number"
                                    value={salaryForm.allowances}
                                    onChange={(e) => setSalaryForm({ ...salaryForm, allowances: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label>Deductions (₵)</label>
                                <input
                                    type="number"
                                    value={salaryForm.deductions}
                                    onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label>Effective From</label>
                                <input
                                    type="date"
                                    value={salaryForm.effective_from}
                                    onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowSalaryModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Save Salary
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Record Payment - {selectedEmployee?.name}</h2>
                        <div className="payment-info">
                            <p><strong>Amount:</strong> ₵{selectedEmployee?.salary?.total_compensation}</p>
                            <p><strong>Month:</strong> {new Date(currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                        <form onSubmit={handleRecordPayment}>
                            <div className="form-group">
                                <label>Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentForm.payment_date}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select
                                    value={paymentForm.payment_method}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                                    required
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Reference Number</label>
                                <input
                                    type="text"
                                    value={paymentForm.reference_number}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                                    placeholder="Transaction reference"
                                />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    placeholder="Additional notes..."
                                    rows="3"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Payroll;
