// frontend/js/login.js
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://ess-backend.onrender.com';
const API_URL = `${API_BASE}/api/auth/login`;

// Handle Form Submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.getElementById('selectedRole').value;
    const errorMsg = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    errorMsg.classList.add('hidden');
    loginBtn.innerText = 'Signing in...';
    loginBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // ✅ Role mismatch check — staff cannot login as admin, etc.
            if (data.role !== role) {
                const roleLabel = { admin: 'Admin', staff: 'Staff', technician: 'Technician' };
                errorMsg.innerText = `⚠️ This account is registered as "${roleLabel[data.role]}", not "${roleLabel[role]}". Please select the correct role tab.`;
                errorMsg.classList.remove('hidden');
                return; // stop here, don't store token
            }

            // Store session
            localStorage.setItem('ess_token', data.token);
            localStorage.setItem('ess_role', data.role);

            // Redirect to the correct dashboard
            if (data.role === 'admin')           window.location.href = '../admin.html';
            else if (data.role === 'staff')       window.location.href = '../dashboard/staff.html';
            else if (data.role === 'technician')  window.location.href = '../dashboard/technician.html';

        } else {
            errorMsg.innerText = '❌ ' + (data.message || 'Invalid email or password.');
            errorMsg.classList.remove('hidden');
        }

    } catch (err) {
        errorMsg.innerText = '⚠️ Network error — could not reach the server.';
        errorMsg.classList.remove('hidden');
    } finally {
        loginBtn.innerText = 'Login';
        loginBtn.disabled = false;
    }
});
