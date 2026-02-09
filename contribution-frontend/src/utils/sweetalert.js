import Swal from 'sweetalert2';

// Custom SweetAlert2 configuration with dark theme
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
    background: '#1a1a1a',
    color: '#fff',
    iconColor: '#D4AF37',
});

// Success alert
export const showSuccess = (message, title = 'Success!') => {
    return Toast.fire({
        icon: 'success',
        title: title,
        text: message,
    });
};

// Error alert
export const showError = (message, title = 'Error!') => {
    return Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonColor: '#D4AF37',
        background: '#1a1a1a',
        color: '#fff',
    });
};

// Warning alert
export const showWarning = (message, title = 'Warning!') => {
    return Swal.fire({
        icon: 'warning',
        title: title,
        text: message,
        confirmButtonColor: '#D4AF37',
        background: '#1a1a1a',
        color: '#fff',
    });
};

// Info alert
export const showInfo = (message, title = 'Info') => {
    return Swal.fire({
        icon: 'info',
        title: title,
        text: message,
        confirmButtonColor: '#D4AF37',
        background: '#1a1a1a',
        color: '#fff',
    });
};

// Confirmation dialog
export const showConfirm = (message, title = 'Are you sure?') => {
    return Swal.fire({
        title: title,
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#D4AF37',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
        background: '#1a1a1a',
        color: '#fff',
    });
};

// Input prompt
export const showPrompt = (message, title = 'Enter value', inputType = 'text', placeholder = '') => {
    return Swal.fire({
        title: title,
        text: message,
        input: inputType,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonColor: '#D4AF37',
        cancelButtonColor: '#d33',
        background: '#1a1a1a',
        color: '#fff',
        inputAttributes: {
            style: 'background: #2a2a2a; color: #fff; border: 1px solid #3a3a3a;'
        },
    });
};

// Textarea prompt
export const showTextareaPrompt = (message, title = 'Enter details', placeholder = '') => {
    return Swal.fire({
        title: title,
        text: message,
        input: 'textarea',
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonColor: '#D4AF37',
        cancelButtonColor: '#d33',
        background: '#1a1a1a',
        color: '#fff',
        inputAttributes: {
            style: 'background: #2a2a2a; color: #fff; border: 1px solid #3a3a3a;'
        },
    });
};

// Loading alert
export const showLoading = (message = 'Loading...') => {
    return Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        },
        background: '#1a1a1a',
        color: '#fff',
    });
};

// Close any open alert
export const closeAlert = () => {
    Swal.close();
};

export default {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showPrompt,
    showTextareaPrompt,
    showLoading,
    closeAlert,
};
