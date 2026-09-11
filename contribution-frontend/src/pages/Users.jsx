import { useState, useEffect, useRef } from 'react';
import { userAPI, branchAPI, permissionAPI } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Eye, 
    EyeOff, 
    Edit, 
    Trash2, 
    TrendingUp, 
    MapPin, 
    Phone, 
    Mail, 
    Building, 
    User, 
    Camera, 
    X,
} from 'lucide-react';
import '../styles/App.css';

function Users({ roleFilter, title }) {
    const { user, isCEO, isSecretary, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Create Modal State
    const [showModal, setShowModal] = useState(false);
    const [createImagePreview, setCreateImagePreview] = useState(null);
    const [createImageFile, setCreateImageFile] = useState(null);
    const createFileInputRef = useRef(null);

    // View Modal State
    const [viewUser, setViewUser] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Edit Modal State
    const [editUser, setEditUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [editImageFile, setEditImageFile] = useState(null);
    const editFileInputRef = useRef(null);

    // Password view toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);

    // Permission Management State
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Worker deactivation state
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [workerToDeactivate, setWorkerToDeactivate] = useState(null);
    const [transferToWorkerId, setTransferToWorkerId] = useState('');
    const [activeWorkers, setActiveWorkers] = useState([]);
    const [customerCount, setCustomerCount] = useState(0);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        password_confirmation: '',
        role: roleFilter || 'worker',
        branch_id: ''
    });

    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        branch_id: '',
        role: 'worker',
        status: 'active',
        password: '',
        password_confirmation: ''
    });

    useEffect(() => {
        fetchData();
    }, [roleFilter]);

    useEffect(() => {
        // Auto-assign branch for Secretary when modal opens or user loads
        if (isSecretary && user?.branch_id) {
            setFormData(prev => ({
                ...prev,
                branch_id: user.branch_id,
                role: 'worker'
            }));
        }
    }, [isSecretary, user, showModal]);

    const fetchData = async () => {
        try {
            const [usersRes, branchesRes] = await Promise.all([
                userAPI.getAll({ include_inactive: true }),
                branchAPI.getAll()
            ]);

            let filteredUsers = usersRes.data.data || usersRes.data;
            if (roleFilter) {
                const userList = Array.isArray(filteredUsers) ? filteredUsers : (filteredUsers.data || []);
                filteredUsers = userList.filter(u => u.roles?.[0]?.name === roleFilter);
            } else {
                filteredUsers = Array.isArray(filteredUsers) ? filteredUsers : (filteredUsers.data || []);
            }

            setUsers(filteredUsers);

            const branchList = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []);
            setBranches(branchList);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Image Selection Handlers ---
    const handleCreateImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showError('Image size must be less than 5MB');
                return;
            }
            setCreateImageFile(file);
            setCreateImagePreview(URL.createObjectURL(file));
        }
    };

    const handleEditImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showError('Image size must be less than 5MB');
                return;
            }
            setEditImageFile(file);
            setEditImagePreview(URL.createObjectURL(file));
        }
    };

    // --- View User Details ---
    const handleViewUser = async (targetUser) => {
        try {
            const res = await userAPI.get(targetUser.id);
            setViewUser(res.data);
            setShowViewModal(true);
        } catch (err) {
            setViewUser(targetUser);
            setShowViewModal(true);
        }
    };

    // --- Open Edit Modal ---
    const handleOpenEdit = (targetUser) => {
        setEditUser(targetUser);
        setEditFormData({
            name: targetUser.name || '',
            email: targetUser.email || '',
            phone: targetUser.phone || '',
            address: targetUser.address || '',
            branch_id: targetUser.branch_id || '',
            role: targetUser.roles?.[0]?.name || 'worker',
            status: targetUser.status || 'active',
            password: '',
            password_confirmation: ''
        });
        setEditImagePreview(targetUser.profile_pic || null);
        setEditImageFile(null);
        setShowEditModal(true);
    };

    // --- Permissions Modal Handlers ---
    const handleOpenPermissions = async (user) => {
        if (!isCEO && !isSuperAdmin) return;
        try {
            const permsRes = await permissionAPI.getAll();
            setAllPermissions(permsRes.data);

            const userDetails = await userAPI.get(user.id);
            const freshUser = userDetails.data;

            setSelectedUser(freshUser);

            const effectivePerms = freshUser.permissions ? freshUser.permissions.map(p => p.name) : [];
            setUserPermissions(effectivePerms);
            setShowPermissionsModal(true);
        } catch (error) {
            console.error('Failed to load permissions', error);
        }
    };

    const handlePermissionToggle = (permName) => {
        if (userPermissions.includes(permName)) {
            setUserPermissions(userPermissions.filter(p => p !== permName));
        } else {
            setUserPermissions([...userPermissions, permName]);
        }
    };

    const handleSavePermissions = async () => {
        const result = await showConfirm(
            `Are you sure you want to update permissions for ${selectedUser.name}?`,
            'Update Permissions'
        );

        if (!result.isConfirmed) return;

        setIsSaving(true);
        try {
            await permissionAPI.syncUser(selectedUser.id, userPermissions);
            setShowPermissionsModal(false);
            fetchData();
            showSuccess('Permissions updated successfully');
        } catch (error) {
            console.error('Failed to sync permissions', error);
            showError('Failed to update permissions');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Create User Submit ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        const phoneRegex = /^[0-9]{10}$/;
        if (formData.phone && !phoneRegex.test(formData.phone)) {
            showError('Phone number must be exactly 10 digits.');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            showError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
            return;
        }

        if (formData.password !== formData.password_confirmation) {
            showError('Passwords do not match.');
            return;
        }

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            if (formData.phone) data.append('phone', formData.phone);
            if (formData.address) data.append('address', formData.address);
            data.append('branch_id', formData.branch_id);
            data.append('role', formData.role);
            data.append('password', formData.password);
            data.append('password_confirmation', formData.password_confirmation);
            if (createImageFile) {
                data.append('profile_pic', createImageFile);
            }

            await userAPI.create(data);
            setShowModal(false);
            setFormData({
                name: '', email: '', phone: '', address: '', password: '', password_confirmation: '',
                role: roleFilter || 'worker',
                branch_id: isSecretary ? user.branch_id : ''
            });
            setCreateImageFile(null);
            setCreateImagePreview(null);
            fetchData();
            showSuccess('Staff member created successfully');
        } catch (error) {
            console.error('Failed to create user', error);
            showError(error.response?.data?.message || 'Error creating user.');
        }
    };

    // --- Edit User Submit ---
    const handleEditSubmit = async (e) => {
        e.preventDefault();

        const phoneRegex = /^[0-9]{10}$/;
        if (editFormData.phone && !phoneRegex.test(editFormData.phone)) {
            showError('Phone number must be exactly 10 digits.');
            return;
        }

        if (editFormData.password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
            if (!passwordRegex.test(editFormData.password)) {
                showError('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.');
                return;
            }
            if (editFormData.password !== editFormData.password_confirmation) {
                showError('Passwords do not match.');
                return;
            }
        }

        try {
            const data = new FormData();
            data.append('name', editFormData.name);
            data.append('email', editFormData.email);
            if (editFormData.phone) data.append('phone', editFormData.phone);
            data.append('address', editFormData.address || '');
            if (editFormData.branch_id) data.append('branch_id', editFormData.branch_id);
            if (editFormData.role) data.append('role', editFormData.role);
            if (editFormData.status) data.append('status', editFormData.status);
            if (editFormData.password) {
                data.append('password', editFormData.password);
                data.append('password_confirmation', editFormData.password_confirmation);
            }
            if (editImageFile) {
                data.append('profile_pic', editImageFile);
            }

            await userAPI.update(editUser.id, data);
            setShowEditModal(false);
            setEditUser(null);
            setEditImageFile(null);
            setEditImagePreview(null);
            fetchData();
            showSuccess('Staff details updated successfully');
        } catch (error) {
            console.error('Failed to update user', error);
            showError(error.response?.data?.message || 'Error updating user.');
        }
    };

    // --- Deactivation Handler ---
    const handleDeactivate = async (targetUser) => {
        const userId = targetUser.id;
        const userName = targetUser.name;
        const isWorker = targetUser.roles?.[0]?.name === 'worker';

        if (!isCEO && !isSuperAdmin) {
            showError('Only CEO or Super Admin has permission to deactivate users');
            return;
        }

        if (userId === user?.id) {
            showError('You cannot deactivate your own account');
            return;
        }

        const result = await showConfirm(
            `Deactivate User "${userName}"?`,
            'This user will no longer be able to log in. This action can be reversed by updating their status.',
            'Deactivate',
            'Cancel'
        );

        if (!result.isConfirmed) return;

        try {
            if (isWorker) {
                try {
                    const response = await userAPI.deactivateWorker(userId, null);
                    showSuccess(`${userName} has been deactivated successfully`);
                    fetchData();
                } catch (err) {
                    if (err.response?.status === 422 && err.response?.data?.error === 'Worker has customers') {
                        setWorkerToDeactivate(targetUser);
                        setCustomerCount(err.response.data.customer_count);
                        const otherWorkers = users.filter(u =>
                            u.id !== userId &&
                            u.roles?.[0]?.name === 'worker' &&
                            u.status === 'active'
                        );
                        setActiveWorkers(otherWorkers);
                        setShowTransferModal(true);
                    } else {
                        throw err;
                    }
                }
            } else {
                await userAPI.deactivate(userId);
                fetchData();
                showSuccess(`${userName} has been deactivated successfully`);
            }
        } catch (error) {
            console.error('Failed to deactivate user', error);
            showError(error.response?.data?.message || 'Error deactivating user.');
        }
    };

    const handleConfirmTransferDeactivate = async () => {
        if (!transferToWorkerId) {
            showError('Please select a worker to transfer customers to.');
            return;
        }

        try {
            await userAPI.deactivateWorker(workerToDeactivate.id, transferToWorkerId);
            setShowTransferModal(false);
            setWorkerToDeactivate(null);
            setTransferToWorkerId('');
            fetchData();
            showSuccess(`${workerToDeactivate.name} has been deactivated and customers transferred.`);
        } catch (error) {
            console.error('Failed to transfer and deactivate', error);
            showError(error.response?.data?.message || 'Error transferring customers.');
        }
    };

    return (
        <div className="users-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ color: 'var(--primary-color)', margin: '0 0 6px 0' }}>{title || 'Staff Management'}</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Manage branch managers, workers, profile details, and performance tracking</p>
                </div>
                {(isSuperAdmin || isCEO || (isSecretary && roleFilter === 'worker')) && (
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        + Add New {roleFilter === 'worker' ? 'Worker' : roleFilter === 'secretary' ? 'Manager' : 'Staff'}
                    </button>
                )}
            </div>

            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Staff Member</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Role</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Branch</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Address / Phone</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {loading ? 'Loading staff records...' : 'No staff members found.'}
                                </td>
                            </tr>
                        ) : (
                            users.map(u => {
                                const roleName = u.roles?.[0]?.name || 'worker';
                                const displayRole = roleName === 'secretary' ? 'Manager' : roleName;
                                const isManagerOrWorker = roleName === 'worker' || roleName === 'secretary' || roleName === 'manager' || roleName === 'branch_manager';

                                return (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {/* Avatar */}
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #00dfa2, #0083b0)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '700',
                                                    color: '#fff',
                                                    fontSize: '15px',
                                                    flexShrink: 0,
                                                    overflow: 'hidden',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    {u.profile_pic ? (
                                                        <img src={u.profile_pic} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        u.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: '#ffffff' }}>{u.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                textTransform: 'uppercase',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: roleName === 'ceo' ? 'rgba(0, 223, 162, 0.15)' : roleName === 'secretary' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                                color: roleName === 'ceo' ? 'var(--primary-color)' : roleName === 'secretary' ? '#60a5fa' : '#d1d5db',
                                                border: `1px solid ${roleName === 'ceo' ? 'rgba(0, 223, 162, 0.3)' : roleName === 'secretary' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`
                                            }}>
                                                {displayRole}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ color: u.branch?.name ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                {u.branch?.name || (roleName === 'ceo' ? 'All Branches' : '-')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '13px' }}>{u.phone || 'No phone'}</div>
                                            {u.address && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                    <MapPin size={11} /> {u.address}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                background: u.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: u.status === 'active' ? '#34d399' : '#f87171'
                                            }}>
                                                {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                {/* View Button */}
                                                <button
                                                    className="btn-secondary"
                                                    style={{ padding: '5px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={() => handleViewUser(u)}
                                                    title="View Profile Details"
                                                >
                                                    <Eye size={13} /> View
                                                </button>

                                                {/* Edit Button */}
                                                {(isSuperAdmin || isCEO || (isSecretary && u.branch_id === user?.branch_id && roleName === 'worker')) && (
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ padding: '5px 10px', fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        onClick={() => handleOpenEdit(u)}
                                                        title="Edit Staff Information"
                                                    >
                                                        <Edit size={13} /> Edit
                                                    </button>
                                                )}

                                                {/* Permissions Button - CEO Only */}
                                                {(isSuperAdmin || isCEO) && (
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ padding: '5px 10px', fontSize: '12px' }}
                                                        onClick={() => handleOpenPermissions(u)}
                                                        title="Manage Permissions"
                                                    >
                                                        Permissions
                                                    </button>
                                                )}

                                                {/* Performance Button */}
                                                {isManagerOrWorker && (
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ padding: '5px 10px', fontSize: '12px', background: 'rgba(33, 150, 243, 0.1)', color: '#2196f3', border: '1px solid rgba(33, 150, 243, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        onClick={() => navigate(`/performance/${u.id}`)}
                                                        title="View Performance Intelligence"
                                                    >
                                                        <TrendingUp size={13} /> Performance
                                                    </button>
                                                )}

                                                {/* Deactivate Button */}
                                                {(isCEO || isSuperAdmin) && (roleName === 'worker' || roleName === 'secretary') && u.id !== user?.id && (
                                                    <button
                                                        className="btn-danger"
                                                        style={{ padding: '5px 10px', fontSize: '12px', background: 'rgba(244, 67, 54, 0.1)', color: '#f44336', border: '1px solid rgba(244, 67, 54, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        onClick={() => handleDeactivate(u)}
                                                        title="Deactivate Staff"
                                                    >
                                                        <Trash2 size={13} /> Deactivate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- View Staff Details Modal --- */}
            {showViewModal && viewUser && (
                <div className="custom-modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="custom-modal-content" style={{ maxWidth: '520px', padding: '28px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '20px' }}>Staff Profile Details</h2>
                            <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                            {/* Profile Image */}
                            <div style={{
                                width: '84px',
                                height: '84px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #00dfa2, #0083b0)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '800',
                                color: '#fff',
                                fontSize: '32px',
                                overflow: 'hidden',
                                marginBottom: '14px',
                                boxShadow: '0 4px 14px rgba(0, 223, 162, 0.25)',
                                border: '2px solid rgba(255,255,255,0.15)'
                            }}>
                                {viewUser.profile_pic ? (
                                    <img src={viewUser.profile_pic} alt={viewUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    viewUser.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#fff' }}>{viewUser.name}</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{
                                    textTransform: 'uppercase',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    background: 'rgba(0, 223, 162, 0.12)',
                                    color: 'var(--primary-color)',
                                    border: '1px solid rgba(0, 223, 162, 0.3)'
                                }}>
                                    {viewUser.roles?.[0]?.name === 'secretary' ? 'Manager' : viewUser.roles?.[0]?.name || 'Worker'}
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: viewUser.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: viewUser.status === 'active' ? '#34d399' : '#f87171'
                                }}>
                                    {viewUser.status ? viewUser.status.toUpperCase() : 'ACTIVE'}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Mail size={12} /> Email Address
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff', wordBreak: 'break-all' }}>
                                    {viewUser.email || '-'}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={12} /> Phone Number
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>
                                    {viewUser.phone ? <a href={`tel:${viewUser.phone}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>{viewUser.phone}</a> : 'Not provided'}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Building size={12} /> Assigned Branch
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>
                                    {viewUser.branch?.name || (viewUser.roles?.[0]?.name === 'ceo' ? 'All Branches' : 'Unassigned')}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={12} /> Home Address
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>
                                    {viewUser.address || 'Not provided'}
                                </div>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ flex: 1, background: 'rgba(0, 223, 162, 0.06)', border: '1px solid rgba(0, 223, 162, 0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Assigned Customers</div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-color)', marginTop: '2px' }}>
                                    {viewUser.customers_count ?? 0}
                                </div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Payments</div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#60a5fa', marginTop: '2px' }}>
                                    {viewUser.payments_count ?? 0}
                                </div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Joined Date</div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', marginTop: '4px' }}>
                                    {viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString() : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {(viewUser.roles?.[0]?.name === 'worker' || viewUser.roles?.[0]?.name === 'secretary' || viewUser.roles?.[0]?.name === 'manager') && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    onClick={() => {
                                        setShowViewModal(false);
                                        navigate(`/performance/${viewUser.id}`);
                                    }}
                                >
                                    <TrendingUp size={16} /> View Performance
                                </button>
                            )}
                            {(isSuperAdmin || isCEO) && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    onClick={() => {
                                        setShowViewModal(false);
                                        handleOpenEdit(viewUser);
                                    }}
                                >
                                    <Edit size={16} /> Edit Details
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowViewModal(false)}
                                style={{ padding: '0 16px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit Staff Modal --- */}
            {showEditModal && editUser && (
                <div className="custom-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="custom-modal-content" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '20px' }}>Edit Staff: {editUser.name}</h2>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit}>
                            {/* Profile Image Upload Box */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #00dfa2, #0083b0)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    color: '#fff',
                                    fontSize: '24px',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
                                    {editImagePreview ? (
                                        <img src={editImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        editFormData.name?.charAt(0).toUpperCase() || <User size={24} />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                                        Profile Photo <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Optional)</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="file"
                                            ref={editFileInputRef}
                                            onChange={handleEditImageChange}
                                            accept="image/png,image/jpeg,image/webp"
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => editFileInputRef.current?.click()}
                                        >
                                            <Camera size={14} /> Choose Image
                                        </button>
                                        {editImagePreview && (
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                style={{ padding: '6px 10px', fontSize: '12px', color: '#f87171' }}
                                                onClick={() => {
                                                    setEditImageFile(null);
                                                    setEditImagePreview(null);
                                                }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <small style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>JPG, PNG or WebP up to 5MB</small>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Phone Number (10 digits)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 0244123456"
                                        value={editFormData.phone}
                                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                        pattern="[0-9]{10}"
                                        title="Phone number must be exactly 10 digits"
                                    />
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Home Address <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(Optional)</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. House No. 42, Accra Road, Kumasi"
                                        value={editFormData.address}
                                        onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Role</label>
                                    {isCEO || isSuperAdmin ? (
                                        <select
                                            value={editFormData.role}
                                            onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                                        >
                                            <option value="worker">Worker (Field Collector)</option>
                                            <option value="secretary">Manager (Branch Admin)</option>
                                            {isSuperAdmin && <option value="ceo">CEO</option>}
                                        </select>
                                    ) : (
                                        <input type="text" value="Worker" disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} />
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Branch</label>
                                    {isCEO || isSuperAdmin ? (
                                        <select
                                            value={editFormData.branch_id}
                                            onChange={e => setEditFormData({ ...editFormData, branch_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Branch</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input type="text" value={user?.branch?.name || 'My Branch'} disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} />
                                    )}
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Account Status</label>
                                    <select
                                        value={editFormData.status}
                                        onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                                    >
                                        <option value="active">Active (Can Log In & Transact)</option>
                                        <option value="inactive">Inactive (Suspended from Login)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Optional Password Change Accordion / Box */}
                            <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                    Change Password <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(Leave blank to keep unchanged)</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px' }}>New Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showEditPassword ? "text" : "password"}
                                                placeholder="New password (8+ chars)"
                                                value={editFormData.password}
                                                onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                                                style={{ paddingRight: '36px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEditPassword(!showEditPassword)}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                                            >
                                                {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px' }}>Confirm Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showEditConfirmPassword ? "text" : "password"}
                                                placeholder="Repeat password"
                                                value={editFormData.password_confirmation}
                                                onChange={e => setEditFormData({ ...editFormData, password_confirmation: e.target.value })}
                                                style={{ paddingRight: '36px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                                            >
                                                {showEditConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)} style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Create User Modal --- */}
            {showModal && (
                <div className="custom-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="custom-modal-content" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '20px' }}>
                                Create New {roleFilter === 'worker' ? 'Worker' : roleFilter === 'secretary' ? 'Manager' : 'Staff'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Profile Image Upload Box */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #00dfa2, #0083b0)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    color: '#fff',
                                    fontSize: '24px',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}>
                                    {createImagePreview ? (
                                        <img src={createImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        formData.name?.charAt(0).toUpperCase() || <User size={24} />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                                        Profile Photo <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Optional)</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="file"
                                            ref={createFileInputRef}
                                            onChange={handleCreateImageChange}
                                            accept="image/png,image/jpeg,image/webp"
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => createFileInputRef.current?.click()}
                                        >
                                            <Camera size={14} /> Upload Photo
                                        </button>
                                        {createImagePreview && (
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                style={{ padding: '6px 10px', fontSize: '12px', color: '#f87171' }}
                                                onClick={() => {
                                                    setCreateImageFile(null);
                                                    setCreateImagePreview(null);
                                                }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <small style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>JPG, PNG or WebP up to 5MB</small>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Samuel K. Mensah"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. samuel@neziz.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Phone Number (10 digits)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 0244123456"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        pattern="[0-9]{10}"
                                        title="Phone number must be exactly 10 digits"
                                    />
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Home Address <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(Optional)</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. House No. 42, Block B, Kumasi"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Role *</label>
                                    {isSecretary ? (
                                        <input type="text" value="Worker" disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} />
                                    ) : (
                                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="worker">Worker (Field Collector)</option>
                                            <option value="secretary">Manager (Branch Admin)</option>
                                        </select>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Assign Branch *</label>
                                    {isSecretary ? (
                                        <input type="text" value={user?.branch?.name || 'My Branch'} disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} />
                                    ) : (
                                        <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} required>
                                            <option value="">Select Branch</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Password *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Min 8 characters"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Confirm Password *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm password"
                                            value={formData.password_confirmation}
                                            onChange={e => setFormData({ ...formData, password_confirmation: e.target.value })}
                                            required
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                    Create Staff
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Permission Management Modal --- */}
            {showPermissionsModal && selectedUser && (
                <div className="custom-modal-overlay" onClick={() => setShowPermissionsModal(false)}>
                    <div className="custom-modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>Manage Permissions</h2>
                        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                            Staff: <strong>{selectedUser.name}</strong> ({selectedUser.roles?.[0]?.name})
                        </p>

                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px', maxHeight: '400px', overflowY: 'auto', marginBottom: '24px'
                        }}>
                            {allPermissions.map(perm => (
                                <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                    <input
                                        type="checkbox"
                                        checked={userPermissions.includes(perm)}
                                        onChange={() => handlePermissionToggle(perm)}
                                    />
                                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                        {perm.replace(/_/g, ' ')}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setShowPermissionsModal(false)} style={{ flex: 1 }}>Cancel</button>
                            <button type="button" className="btn-primary" onClick={handleSavePermissions} style={{ flex: 1 }} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Deactivate Worker with Transfer Modal --- */}
            {showTransferModal && (
                <div className="custom-modal-overlay" onClick={() => setShowTransferModal(false)}>
                    <div className="custom-modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '16px', color: 'var(--danger-color)' }}>Transfer Customers</h2>
                        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                            Worker <strong>{workerToDeactivate?.name}</strong> has <strong>{customerCount}</strong> active customers.
                            Please select another active worker to transfer these customers to before deactivation.
                        </p>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label>Transfer Customers To:</label>
                            <select
                                value={transferToWorkerId}
                                onChange={e => setTransferToWorkerId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    marginTop: '8px'
                                }}
                                required
                            >
                                <option value="">Select Target Worker</option>
                                {activeWorkers.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} ({w.branch?.name || 'N/A'})</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowTransferModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-danger"
                                onClick={handleConfirmTransferDeactivate}
                                disabled={!transferToWorkerId}
                                style={{ padding: '10px 20px' }}
                            >
                                Transfer & Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;
