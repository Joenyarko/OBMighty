import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerList from './pages/CustomerList';
import Layout from './components/Layout';
import Inventory from './pages/Inventory';
import Branches from './pages/Branches';
import Reports from './pages/Reports';
import ActivityLog from './pages/ActivityLog';
import Accounting from './pages/Accounting';
import Users from './pages/Users'; // Renamed from Settings
import Settings from './pages/Settings'; // New Settings page
import Payments from './pages/Payments';
import BulkPayment from './pages/BulkPayment';
import Cards from './pages/Cards';
import Sales from './pages/Sales';
import Surplus from './pages/Surplus';
import Payroll from './pages/Payroll';
import Performance from './pages/Performance';
import CustomerBoxTracking from './pages/CustomerBoxTracking';
import AdminDashboard from './pages/admin/AdminDashboard';
import CompanyManagement from './pages/admin/CompanyManagement';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import './styles/App.css';
import './styles/TextColorFix.css';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Layout>{children}</Layout>;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // AdminRoute does NOT wrap in <Layout> because Admin pages use <AdminLayout>
    return children;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute>
                                <Customers />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/customers/list"
                        element={
                            <ProtectedRoute>
                                <CustomerList />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/customers/:customerId/boxes"
                        element={
                            <ProtectedRoute>
                                <CustomerBoxTracking />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                    <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
                    <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />

                    {/* Reusing Users component for different roles */}
                    <Route path="/workers" element={<ProtectedRoute><Users roleFilter="worker" title="Workers" /></ProtectedRoute>} />
                    <Route path="/branch-managers" element={<ProtectedRoute><Users roleFilter="secretary" title="Branch Managers" /></ProtectedRoute>} />
                    <Route path="/users" element={<ProtectedRoute><Users title="All Users" /></ProtectedRoute>} />

                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                    <Route path="/bulk-entry" element={<ProtectedRoute><BulkPayment /></ProtectedRoute>} />
                    <Route path="/cards" element={<ProtectedRoute><Cards /></ProtectedRoute>} />
                    <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
                    <Route path="/performance/:workerId" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                    <Route path="/surplus" element={<ProtectedRoute><Surplus /></ProtectedRoute>} />
                    <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />

                    <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/companies" element={<AdminRoute><CompanyManagement /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
