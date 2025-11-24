// Admin Panel JavaScript

const API_BASE = '/api/admin';
let authToken = null;
let currentView = 'overview';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    authToken = localStorage.getItem('adminToken');

    if (authToken) {
        showDashboard();
        loadView('overview');
    } else {
        showLogin();
    }

    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;

            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            loadView(view);
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ===== AUTHENTICATION =====
async function handleLogin(e) {
    e.preventDefault();

    const code1 = document.getElementById('code1').value;
    const code2 = document.getElementById('code2').value;
    const code3 = document.getElementById('code3').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code1, code2, code3 })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            showDashboard();
            loadView('overview');
        } else {
            errorDiv.textContent = data.error || 'Invalid confirmation codes';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Login failed. Please try again.';
        errorDiv.classList.add('show');
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    authToken = null;
    localStorage.removeItem('adminToken');
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'grid';
}

// ===== API CALLS =====
async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
    }

    return response.json();
}

// ===== VIEW RENDERING =====
async function loadView(view) {
    currentView = view;
    const container = document.getElementById('viewContainer');

    switch (view) {
        case 'overview':
            await renderOverview(container);
            break;
        case 'users':
            await renderUsers(container);
            break;
        case 'posts':
            await renderPosts(container);
            break;
        case 'reports':
            await renderReports(container);
            break;
        case 'actions':
            await renderActions(container);
            break;
        case 'settings':
            await renderSettings(container);
            break;
    }
}

// ===== OVERVIEW VIEW =====
async function renderOverview(container) {
    container.innerHTML = '<div class="loading">Loading statistics...</div>';

    try {
        const stats = await apiCall('/stats');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">Dashboard Overview</h1>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Total Users</span>
                        <div class="stat-card-icon" style="background: rgba(29, 161, 242, 0.1); color: var(--color-primary);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2"/>
                                <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.total_users || 0}</div>
                    <div class="stat-card-label">Registered users</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Total Posts</span>
                        <div class="stat-card-icon" style="background: rgba(23, 191, 99, 0.1); color: var(--color-success);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.total_posts || 0}</div>
                    <div class="stat-card-label">Posts created</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Total Likes</span>
                        <div class="stat-card-icon" style="background: rgba(249, 24, 128, 0.1); color: var(--color-danger);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7564 5.72718 21.351 5.12075 20.84 4.61Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.total_likes || 0}</div>
                    <div class="stat-card-label">Likes given</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Pending Reports</span>
                        <div class="stat-card-icon" style="background: rgba(255, 173, 31, 0.1); color: var(--color-warning);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.9011 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.9011 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.pending_reports || 0}</div>
                    <div class="stat-card-label">Awaiting review</div>
                </div>
            </div>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Quick Stats</h2>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                    <div>
                        <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Support Users</div>
                        <div style="font-size: 1.5rem; font-weight: 700;">${stats.support_users || 0}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Regular Users</div>
                        <div style="font-size: 1.5rem; font-weight: 700;">${(stats.total_users - stats.support_users) || 0}</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading overview:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load statistics</div>';
    }
}

// ===== USERS VIEW =====
async function renderUsers(container) {
    container.innerHTML = '<div class="loading">Loading users...</div>';

    try {
        const users = await apiCall('/users');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">User Management</h1>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">All Users (${users.length})</h2>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Display Name</th>
                            <th>Role</th>
                            <th>Posts</th>
                            <th>Likes</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.id}</td>
                                <td>@${user.username}</td>
                                <td>${user.display_name}</td>
                                <td><span class="badge badge-${user.role}">${user.role}</span></td>
                                <td>${user.post_count}</td>
                                <td>${user.like_count}</td>
                                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-${user.role === 'support' ? 'danger' : 'success'}" onclick="toggleUserRole(${user.id}, '${user.role}')">
                                        ${user.role === 'support' ? 'Remove Support' : 'Make Support'}
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load users</div>';
    }
}

async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'support' ? 'user' : 'support';

    if (!confirm(`Change user role to ${newRole}?`)) return;

    try {
        await apiCall(`/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });

        loadView('users');
    } catch (error) {
        console.error('Error updating role:', error);
        alert('Failed to update user role');
    }
}

// ===== POSTS VIEW =====
async function renderPosts(container) {
    container.innerHTML = '<div class="loading">Loading posts...</div>';

    try {
        const posts = await apiCall('/posts');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">Post Moderation</h1>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">All Posts (${posts.length})</h2>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Author</th>
                            <th>Content</th>
                            <th>Reports</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${posts.map(post => `
                            <tr>
                                <td>${post.id}</td>
                                <td>${post.display_name}<br><small style="color: var(--color-text-tertiary);">@${post.username}</small></td>
                                <td style="max-width: 400px;">${escapeHTML(post.content)}</td>
                                <td>${post.report_count > 0 ? `<span class="badge badge-pending">${post.report_count}</span>` : '-'}</td>
                                <td>${new Date(post.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load posts</div>';
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
        await apiCall(`/posts/${postId}`, {
            method: 'DELETE'
        });

        loadView('posts');
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
}

// ===== REPORTS VIEW =====
async function renderReports(container) {
    container.innerHTML = '<div class="loading">Loading reports...</div>';

    try {
        const reports = await apiCall('/reports');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">Content Reports</h1>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">All Reports (${reports.length})</h2>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Post Content</th>
                            <th>Reason</th>
                            <th>Reporter</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.map(report => `
                            <tr>
                                <td>${report.id}</td>
                                <td style="max-width: 300px;">${escapeHTML(report.post_content)}</td>
                                <td><span class="badge badge-pending">${report.reason}</span></td>
                                <td>@${report.reporter_username}</td>
                                <td><span class="badge badge-${report.status}">${report.status}</span></td>
                                <td>${report.assigned_username || '-'}</td>
                                <td>${new Date(report.created_at).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading reports:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load reports</div>';
    }
}

// ===== ACTIONS VIEW =====
async function renderActions(container) {
    container.innerHTML = '<div class="loading">Loading activity log...</div>';

    try {
        const actions = await apiCall('/actions');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">Activity Log</h1>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Recent Admin Actions (${actions.length})</h2>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Action Type</th>
                            <th>Target</th>
                            <th>Description</th>
                            <th>Performed By</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${actions.map(action => `
                            <tr>
                                <td>${action.id}</td>
                                <td><span class="badge badge-user">${action.action_type}</span></td>
                                <td>${action.target_type || '-'} #${action.target_id || '-'}</td>
                                <td>${action.description}</td>
                                <td>${action.performed_by}</td>
                                <td>${new Date(action.created_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading actions:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load activity log</div>';
    }
}

// ===== UTILITY FUNCTIONS =====
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== SETTINGS VIEW =====
async function renderSettings(container) {
    container.innerHTML = '<div class="loading">Loading settings...</div>';

    try {
        const settings = await apiCall('/settings');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">System Settings</h1>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">General Settings</h2>
                </div>
                <div style="padding: var(--spacing-lg);">
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md) 0; border-bottom: 1px solid var(--color-border);">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">User Registration</div>
                            <div style="font-size: 0.875rem; color: var(--color-text-secondary);">Allow new users to register accounts</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="registrationToggle" ${settings.registration_enabled === 'true' ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md) 0; border-bottom: 1px solid var(--color-border);">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">Email Verification</div>
                            <div style="font-size: 0.875rem; color: var(--color-text-secondary);">Require email verification for new accounts</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="emailVerificationToggle" ${settings.email_verification_required === 'true' ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md) 0;">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">Maintenance Mode</div>
                            <div style="font-size: 0.875rem; color: var(--color-text-secondary);">Temporarily disable the site for maintenance</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="maintenanceToggle" ${settings.maintenance_mode === 'true' ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for toggles
        document.getElementById('registrationToggle').addEventListener('change', async (e) => {
            await updateSetting('registration_enabled', e.target.checked ? 'true' : 'false');
        });

        document.getElementById('emailVerificationToggle').addEventListener('change', async (e) => {
            await updateSetting('email_verification_required', e.target.checked ? 'true' : 'false');
        });

        document.getElementById('maintenanceToggle').addEventListener('change', async (e) => {
            await updateSetting('maintenance_mode', e.target.checked ? 'true' : 'false');
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load settings</div>';
    }
}

async function updateSetting(key, value) {
    try {
        await apiCall(`/settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        });
        console.log(`Updated ${key} to ${value}`);
    } catch (error) {
        console.error('Error updating setting:', error);
        alert('Failed to update setting');
    }
}

// Make functions globally available
window.toggleUserRole = toggleUserRole;
window.deletePost = deletePost;
