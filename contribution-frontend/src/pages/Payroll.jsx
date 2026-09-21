import { useState, useEffect, useCallback } from 'react';
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
    getAttendance: (params) => api.get('/payroll/attendance', { params }),
    setAttendance: (data) => api.post('/payroll/attendance', data),
};

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getDate();
}

function formatDayName(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return DAY_ABBR[d.getDay()];
}

function Payroll() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('payroll'); // 'payroll' | 'attendance'
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

    // ─── ATTENDANCE STATE ───────────────────────────────────────────────────
    const [attendanceView, setAttendanceView] = useState('monthly'); // 'monthly' | 'weekly'
    const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7));
    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [attendanceData, setAttendanceData] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);
    const [savingAttendance, setSavingAttendance] = useState(null); // { workerId, date }
    // Manual override modal
    const [overrideModal, setOverrideModal] = useState(null); // { worker, date, currentStatus }
    const [overrideForm, setOverrideForm] = useState({ status: 'absent', notes: '' });

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

    // ─── FETCH ATTENDANCE ───────────────────────────────────────────────────
    const fetchAttendance = useCallback(async () => {
        try {
            setAttendanceLoading(true);
            setAttendanceError(null);
            const params =
                attendanceView === 'monthly'
                    ? { month: attendanceMonth }
                    : { week_start: weekStart };
            const res = await payrollAPI.getAttendance(params);
            setAttendanceData(res.data);
        } catch (err) {
            setAttendanceError('Failed to load attendance data');
        } finally {
            setAttendanceLoading(false);
        }
    }, [attendanceView, attendanceMonth, weekStart]);

    useEffect(() => {
        if (activeTab === 'attendance') {
            fetchAttendance();
        }
    }, [activeTab, attendanceView, attendanceMonth, weekStart, fetchAttendance]);

    // ─── MANUAL ATTENDANCE OVERRIDE ─────────────────────────────────────────
    const openOverrideModal = (worker, date, currentEntry) => {
        if (!currentEntry || currentEntry.status === 'future') return;
        setOverrideModal({ worker, date, currentEntry });
        setOverrideForm({ status: currentEntry.status, notes: currentEntry.notes || '' });
    };

    const handleSaveOverride = async () => {
        if (!overrideModal) return;
        try {
            setSavingAttendance({ workerId: overrideModal.worker.worker_id, date: overrideModal.date });
            await payrollAPI.setAttendance({
                worker_id: overrideModal.worker.worker_id,
                date: overrideModal.date,
                status: overrideForm.status,
                notes: overrideForm.notes || undefined,
            });
            showSuccess('Attendance updated');
            setOverrideModal(null);
            fetchAttendance();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to update attendance');
        } finally {
            setSavingAttendance(null);
        }
    };

    // Quick toggle without modal (for simple present/absent flip)
    const handleQuickToggle = async (worker, date, currentEntry) => {
        if (!currentEntry || currentEntry.status === 'future') return;
        const newStatus = currentEntry.status === 'present' ? 'absent' : 'present';
        try {
            setSavingAttendance({ workerId: worker.worker_id, date });
            await payrollAPI.setAttendance({
                worker_id: worker.worker_id,
                date,
                status: newStatus,
            });
            fetchAttendance();
        } catch (err) {
            showError('Failed to update attendance');
        } finally {
            setSavingAttendance(null);
        }
    };

    // ─── PAYROLL HANDLERS ───────────────────────────────────────────────────
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

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'paid' && emp.isPaid) ||
            (filterStatus === 'unpaid' && !emp.isPaid);
        return matchesSearch && matchesStatus;
    });

    // ─── WEEK NAVIGATION ────────────────────────────────────────────────────
    const shiftWeek = (dir) => {
        const d = new Date(weekStart + 'T00:00:00');
        d.setDate(d.getDate() + dir * 7);
        setWeekStart(d.toISOString().slice(0, 10));
    };

    // ─── RENDER ──────────────────────────────────────────────────────────────
    if (loading) {
        return <div className="loading">Loading payroll data...</div>;
    }

    return (
        <div className="payroll-page">
            {/* Header */}
            <div className="page-header">
                <h1>💰 Payroll Management</h1>
            </div>

            {/* Tab Switcher */}
            <div className="payroll-main-tabs">
                <button
                    className={activeTab === 'payroll' ? 'active' : ''}
                    onClick={() => setActiveTab('payroll')}
                >
                    💵 Payroll
                </button>
                <button
                    className={activeTab === 'attendance' ? 'active' : ''}
                    onClick={() => setActiveTab('attendance')}
                >
                    📅 Attendance
                </button>
            </div>

            {/* ═══════════════ PAYROLL TAB ═══════════════ */}
            {activeTab === 'payroll' && (
                <>
                    {/* Month Selector */}
                    <div className="month-selector">
                        <input
                            type="month"
                            value={currentMonth}
                            onChange={(e) => setCurrentMonth(e.target.value)}
                        />
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
                                {filteredEmployees.map((employee) => (
                                    <tr key={employee.id}>
                                        <td data-label="Name">{employee.name}</td>
                                        <td data-label="Role" style={{ textTransform: 'capitalize' }}>
                                            {employee.role}
                                        </td>
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
                </>
            )}

            {/* ═══════════════ ATTENDANCE TAB ═══════════════ */}
            {activeTab === 'attendance' && (
                <div className="attendance-section">
                    {/* Sub-tabs */}
                    <div className="attendance-sub-tabs">
                        <button
                            className={attendanceView === 'monthly' ? 'active' : ''}
                            onClick={() => setAttendanceView('monthly')}
                        >
                            📆 Monthly
                        </button>
                        <button
                            className={attendanceView === 'weekly' ? 'active' : ''}
                            onClick={() => setAttendanceView('weekly')}
                        >
                            🗓 Weekly
                        </button>
                    </div>

                    {/* Period Controls */}
                    <div className="attendance-controls">
                        {attendanceView === 'monthly' && (
                            <div className="attendance-period-control">
                                <label>Month</label>
                                <input
                                    type="month"
                                    value={attendanceMonth}
                                    onChange={(e) => setAttendanceMonth(e.target.value)}
                                />
                            </div>
                        )}
                        {attendanceView === 'weekly' && (
                            <div className="attendance-week-nav">
                                <button className="week-nav-btn" onClick={() => shiftWeek(-1)}>‹ Prev</button>
                                <span className="week-label">
                                    Week of {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                </span>
                                <button
                                    className="week-nav-btn"
                                    onClick={() => shiftWeek(1)}
                                    disabled={weekStart >= getWeekStart(new Date())}
                                >
                                    Next ›
                                </button>
                            </div>
                        )}
                        <div className="attendance-legend">
                            <span className="legend-item present-legend">✓ Present</span>
                            <span className="legend-item absent-legend">✗ Absent</span>
                            <span className="legend-item off-legend">– Sunday (Off)</span>
                            <span className="legend-item manual-legend">✎ Manual</span>
                            <span className="legend-item future-legend">– Future</span>
                        </div>
                    </div>

                    {/* Hint */}
                    <p className="attendance-hint">
                        Click any past day to toggle or override attendance. Sundays are non-working days by default.
                    </p>

                    {attendanceLoading && (
                        <div className="attendance-loading">
                            <div className="att-spinner"></div>
                            <span>Loading attendance...</span>
                        </div>
                    )}

                    {attendanceError && (
                        <div className="attendance-error">{attendanceError}</div>
                    )}

                    {!attendanceLoading && attendanceData && (
                        <>
                            {attendanceData.workers.length === 0 ? (
                                <div className="attendance-empty">No active workers found.</div>
                            ) : (
                                <div className="attendance-table-wrapper">
                                    <table className="attendance-table">
                                        <thead>
                                            <tr>
                                                <th className="att-worker-col">Worker</th>
                                                {attendanceData.days.map((day) => {
                                                    const isSun = formatDayName(day) === 'SUN';
                                                    return (
                                                        <th key={day} className={`att-day-col ${isSun ? 'att-sunday-header' : ''}`}>
                                                            <div className="att-day-header">
                                                                <span className="att-day-name">{formatDayName(day)}</span>
                                                                <span className="att-day-num">{formatDate(day)}</span>
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                                <th className="att-summary-col">Present</th>
                                                <th className="att-summary-col">Absent</th>
                                                <th className="att-summary-col">Days</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceData.workers.map((worker) => (
                                                <tr key={worker.worker_id}>
                                                    <td className="att-worker-cell">
                                                        <div className="att-worker-info">
                                                            {worker.profile_pic ? (
                                                                <img
                                                                    src={worker.profile_pic}
                                                                    alt={worker.name}
                                                                    className="att-worker-avatar"
                                                                />
                                                            ) : (
                                                                <div className="att-worker-avatar-placeholder">
                                                                    {worker.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="att-worker-name">{worker.name}</div>
                                                                <div className="att-worker-role">{worker.role}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {attendanceData.days.map((day) => {
                                                        const entry = worker.attendance[day];
                                                        const isSaving =
                                                            savingAttendance?.workerId === worker.worker_id &&
                                                            savingAttendance?.date === day;
                                                        const status = entry?.status || 'future';
                                                        const isManual = entry?.source === 'manual';
                                                        const isFuture = status === 'future';
                                                        const isOff = status === 'off';

                                                        let tooltipText = 'Future date';
                                                        if (!isFuture) {
                                                            const statusLabel = isOff ? 'Sunday / Off' : status === 'present' ? 'Present' : 'Absent';
                                                            tooltipText = `${statusLabel} (${isManual ? 'manual' : 'auto'})${entry?.notes ? ' – ' + entry.notes : ''}\nClick to override`;
                                                        }

                                                        return (
                                                            <td
                                                                key={day}
                                                                className={`att-day-cell att-${status} ${isManual ? 'att-manual' : ''} ${isFuture ? '' : 'att-clickable'}`}
                                                                onClick={() => !isFuture && openOverrideModal(worker, day, entry)}
                                                                title={tooltipText}
                                                            >
                                                                {isSaving ? (
                                                                    <span className="att-saving">⟳</span>
                                                                ) : isFuture ? (
                                                                    <span className="att-icon">–</span>
                                                                ) : isOff ? (
                                                                    <span className="att-icon att-off-icon">Off{isManual && <sup>✎</sup>}</span>
                                                                ) : status === 'present' ? (
                                                                    <span className="att-icon">✓{isManual && <sup>✎</sup>}</span>
                                                                ) : (
                                                                    <span className="att-icon">✗{isManual && <sup>✎</sup>}</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="att-summary-cell present-summary">
                                                        {worker.summary.present}
                                                    </td>
                                                    <td className="att-summary-cell absent-summary">
                                                        {worker.summary.absent}
                                                    </td>
                                                    <td className="att-summary-cell total-summary">
                                                        {worker.summary.working_days}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── Override Modal ─────────────────────────────────────── */}
            {overrideModal && (
                <div className="modal-overlay" onClick={() => setOverrideModal(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Override Attendance</h2>
                        <p className="override-info">
                            <strong>{overrideModal.worker.name}</strong> &mdash;{' '}
                            {new Date(overrideModal.date + 'T00:00:00').toLocaleDateString('en-GB', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                        <p className="override-auto-info">
                            Current: <span className={`status-badge ${overrideModal.currentEntry.source === 'auto' ? overrideModal.currentEntry.status : ''}`}>
                                {overrideModal.currentEntry.source === 'auto'
                                    ? (overrideModal.currentEntry.status === 'off' ? 'Sunday (Off)' : overrideModal.currentEntry.status)
                                    : `Manual (${overrideModal.currentEntry.status})`}
                            </span>
                        </p>
                        <div className="form-group">
                            <label>Set Status</label>
                            <div className="override-status-btns">
                                <button
                                    className={`override-btn present-btn ${overrideForm.status === 'present' ? 'selected' : ''}`}
                                    onClick={() => setOverrideForm({ ...overrideForm, status: 'present' })}
                                >
                                    ✓ Present
                                </button>
                                <button
                                    className={`override-btn absent-btn ${overrideForm.status === 'absent' ? 'selected' : ''}`}
                                    onClick={() => setOverrideForm({ ...overrideForm, status: 'absent' })}
                                >
                                    ✗ Absent
                                </button>
                                <button
                                    className={`override-btn off-btn ${overrideForm.status === 'off' ? 'selected' : ''}`}
                                    onClick={() => setOverrideForm({ ...overrideForm, status: 'off' })}
                                >
                                    – Sunday / Off
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Notes (optional)</label>
                            <input
                                type="text"
                                value={overrideForm.notes}
                                onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                                placeholder="e.g., Sick leave, Excused, Sunday service"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setOverrideModal(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveOverride}>Save Override</button>
                        </div>
                    </div>
                </div>
            )}

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
