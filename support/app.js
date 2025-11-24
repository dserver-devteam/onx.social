// Support Panel JavaScript

const API_BASE = '/api/support';
let authToken = null;
let currentUser = null;
let currentView = 'overview';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    authToken = localStorage.getItem('supportToken');
    const userStr = localStorage.getItem('supportUser');

    if (authToken && userStr) {
        currentUser = JSON.parse(userStr);
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

    // Modal overlay click
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeReportModal);
    }
}

// ===== AUTHENTICATION =====
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('supportToken', authToken);
            localStorage.setItem('supportUser', JSON.stringify(currentUser));
            showDashboard();
            loadView('overview');
        } else {
            errorDiv.textContent = data.error || 'Invalid credentials';
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
    currentUser = null;
    localStorage.removeItem('supportToken');
    localStorage.removeItem('supportUser');
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('supportDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('supportDashboard').style.display = 'grid';

    // Update user display name
    const displayNameEl = document.getElementById('userDisplayName');
    if (displayNameEl && currentUser) {
        displayNameEl.textContent = currentUser.displayName;
    }
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

    if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error('Session expired or access denied');
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
        case 'pending':
            await renderReports(container, 'pending');
            break;
        case 'reviewing':
            await renderReports(container, 'reviewing');
            break;
        case 'all':
            await renderReports(container);
            break;
        case 'conversations':
            await renderConversations(container);
            break;
    }
}

// ===== OVERVIEW VIEW =====
async function renderOverview(container) {
    container.innerHTML = '<div class="loading">Loading statistics...</div>';

    try {
        const stats = await apiCall('/stats');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">Support Dashboard</h1>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Pending Reports</span>
                        <div class="stat-card-icon" style="background: rgba(255, 173, 31, 0.1); color: var(--color-warning);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.pending_reports || 0}</div>
                    <div class="stat-card-label">Awaiting review</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">In Review</span>
                        <div class="stat-card-icon" style="background: rgba(29, 161, 242, 0.1); color: var(--color-primary);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M1 12S5 4 12 4C19 4 23 12 23 12S19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.reviewing_reports || 0}</div>
                    <div class="stat-card-label">Currently reviewing</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Resolved</span>
                        <div class="stat-card-icon" style="background: rgba(23, 191, 99, 0.1); color: var(--color-success);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.resolved_reports || 0}</div>
                    <div class="stat-card-label">Completed</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">My Reports</span>
                        <div class="stat-card-icon" style="background: rgba(29, 161, 242, 0.1); color: var(--color-primary);">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.my_reports || 0}</div>
                    <div class="stat-card-label">Assigned to me</div>
                </div>
            </div>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Quick Actions</h2>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="loadView('pending')">View Pending Reports</button>
                    <button class="btn btn-success" onclick="loadView('reviewing')">My Active Reviews</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading overview:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load statistics</div>';
    }
}

// ===== REPORTS VIEW =====
async function renderReports(container, status = null) {
    container.innerHTML = '<div class="loading">Loading reports...</div>';

    try {
        const endpoint = status ? `/reports?status=${status}` : '/reports';
        const reports = await apiCall(endpoint);

        const title = status ? `${status.charAt(0).toUpperCase() + status.slice(1)} Reports` : 'All Reports';

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">${title}</h1>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">${reports.length} Report${reports.length !== 1 ? 's' : ''}</h2>
                </div>
                ${reports.length === 0 ?
                '<div class="loading">No reports found</div>' :
                `<table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Post Content</th>
                                <th>Reason</th>
                                <th>Reporter</th>
                                <th>Status</th>
                                <th>Assigned</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.map(report => `
                                <tr>
                                    <td>${report.id}</td>
                                    <td style="max-width: 300px;">${escapeHTML(report.post_content.substring(0, 100))}${report.post_content.length > 100 ? '...' : ''}</td>
                                    <td><span class="badge badge-pending">${report.reason}</span></td>
                                    <td>@${report.reporter_username}</td>
                                    <td><span class="badge badge-${report.status}">${report.status}</span></td>
                                    <td>${report.assigned_username ? '@' + report.assigned_username : '-'}</td>
                                    <td>${new Date(report.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="viewReport(${report.id})">View</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
            }
            </div>
        `;
    } catch (error) {
        console.error('Error loading reports:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load reports</div>';
    }
}

// ===== REPORT DETAIL MODAL =====
async function viewReport(reportId) {
    try {
        const report = await apiCall(`/reports/${reportId}`);

        const modal = document.getElementById('reportModal');
        const detailsContainer = document.getElementById('reportDetails');

        detailsContainer.innerHTML = `
            <div style="display: grid; gap: 1.5rem;">
                <div>
                    <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--color-text-secondary);">Report Information</h3>
                    <div style="background: var(--color-bg-tertiary); padding: 1rem; border-radius: var(--radius-md);">
                        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <strong>Report ID:</strong> <span>#${report.id}</span>
                            <strong>Status:</strong> <span class="badge badge-${report.status}">${report.status}</span>
                            <strong>Reason:</strong> <span class="badge badge-pending">${report.reason}</span>
                            <strong>Created:</strong> <span>${new Date(report.created_at).toLocaleString()}</span>
                            <strong>Updated:</strong> <span>${new Date(report.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--color-text-secondary);">Reported Post</h3>
                    <div style="background: var(--color-bg-tertiary); padding: 1rem; border-radius: var(--radius-md);">
                        <div style="margin-bottom: 0.5rem;">
                            <strong>Author:</strong> ${report.post_author_display_name} (@${report.post_author_username})
                        </div>
                        <div style="padding: 1rem; background: var(--color-bg-primary); border-radius: var(--radius-sm); margin-top: 0.5rem;">
                            ${escapeHTML(report.post_content)}
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--color-text-secondary);">Reporter</h3>
                    <div style="background: var(--color-bg-tertiary); padding: 1rem; border-radius: var(--radius-md);">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${report.reporter_avatar}" alt="${report.reporter_display_name}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--color-border);">
                            <div>
                                <div><strong>${report.reporter_display_name}</strong></div>
                                <div style="color: var(--color-text-secondary);">@${report.reporter_username}</div>
                            </div>
                        </div>
                        ${report.description ? `
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
                                <strong>Description:</strong><br>
                                ${escapeHTML(report.description)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${report.notes ? `
                    <div>
                        <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--color-text-secondary);">Notes</h3>
                        <div style="background: var(--color-bg-tertiary); padding: 1rem; border-radius: var(--radius-md);">
                            ${escapeHTML(report.notes)}
                        </div>
                    </div>
                ` : ''}
                
                <div>
                    <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--color-text-secondary);">Actions</h3>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${report.status === 'pending' ? `
                            <button class="btn btn-primary" onclick="assignReport(${report.id})">Assign to Me</button>
                        ` : ''}
                        ${report.status === 'reviewing' ? `
                            <button class="btn btn-success" onclick="updateReportStatus(${report.id}, 'resolved')">Mark Resolved</button>
                            <button class="btn btn-danger" onclick="updateReportStatus(${report.id}, 'dismissed')">Dismiss</button>
                        ` : ''}
                        <button class="btn" style="background: var(--color-bg-tertiary);" onclick="addNotes(${report.id})">Add Notes</button>
                        <button class="btn btn-danger" onclick="deleteReportedPost(${report.post_id}, ${report.id})">Delete Post</button>
                        <button class="btn btn-warning" onclick="tempBanUser(${report.post_author_id}, '${report.post_author_username}', ${report.id})">Temp Ban User</button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('show');
    } catch (error) {
        console.error('Error loading report details:', error);
        alert('Failed to load report details');
    }
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    modal.classList.remove('show');
}

async function assignReport(reportId) {
    try {
        await apiCall(`/reports/${reportId}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ userId: currentUser.id })
        });

        closeReportModal();
        loadView(currentView);
    } catch (error) {
        console.error('Error assigning report:', error);
        alert('Failed to assign report');
    }
}

async function updateReportStatus(reportId, status) {
    try {
        await apiCall(`/reports/${reportId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });

        closeReportModal();
        loadView(currentView);
    } catch (error) {
        console.error('Error updating report status:', error);
        alert('Failed to update report status');
    }
}

async function addNotes(reportId) {
    const notes = prompt('Enter notes for this report:');
    if (!notes) return;

    try {
        await apiCall(`/reports/${reportId}/notes`, {
            method: 'PUT',
            body: JSON.stringify({ notes })
        });

        viewReport(reportId); // Refresh the modal
    } catch (error) {
        console.error('Error adding notes:', error);
        alert('Failed to add notes');
    }
}

// ===== CONVERSATIONS VIEW =====
async function renderConversations(container) {
    container.innerHTML = '<div class="loading">Loading conversations...</div>';

    try {
        const conversations = await apiCall('/conversations');

        container.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem;">Conversations</h1>
            
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">${conversations.length} Conversation${conversations.length !== 1 ? 's' : ''}</h2>
                </div>
                ${conversations.length === 0 ?
                '<div class="loading">No conversations found</div>' :
                `<table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Participants</th>
                                <th>Messages</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${conversations.map(conv => `
                                <tr>
                                    <td>${conv.id}</td>
                                    <td>
                                        <div>@${conv.user1_username}</div>
                                        <div>@${conv.user2_username}</div>
                                    </td>
                                    <td>${conv.message_count}</td>
                                    <td>${new Date(conv.updated_at).toLocaleString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="viewConversation(${conv.id})">View Details</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
            }
            </div>
        `;
    } catch (error) {
        console.error('Error loading conversations:', error);
        container.innerHTML = '<div class="loading" style="color: var(--color-danger);">Failed to load conversations</div>';
    }
}

// ===== CONVERSATION DETAIL MODAL =====
async function viewConversation(id) {
    const modal = document.getElementById('conversationModal');
    const detailsContainer = document.getElementById('conversationDetails');

    detailsContainer.innerHTML = `
        <div style="display: grid; gap: 1.5rem;">
            <div style="background: var(--color-bg-tertiary); padding: 1rem; border-radius: var(--radius-md);">
                <p>Conversation ID: <strong>${id}</strong></p>
                <p style="margin-top: 0.5rem; color: var(--color-text-secondary);">
                    This conversation is end-to-end encrypted. Support staff cannot view messages without unlocking the conversation using the master key.
                </p>
            </div>
            
            <div>
                <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--color-text-secondary);">Actions</h3>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-warning" onclick="unlockConversation(${id})">
                        Unlock Conversation
                    </button>
                    <button class="btn btn-primary" onclick="downloadConversation(${id})">
                        Download Logs
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('show');
}

function closeConversationModal() {
    const modal = document.getElementById('conversationModal');
    modal.classList.remove('show');
}

async function unlockConversation(id) {
    if (!confirm('Are you sure you want to unlock this conversation? This action will be logged and users will be notified via email.')) {
        return;
    }

    try {
        const response = await apiCall(`/conversations/${id}/unlock`, { method: 'POST' });
        if (response.success) {
            alert(`Conversation unlocked!\nEncryption Key: ${response.key}`);
        }
    } catch (error) {
        console.error('Error unlocking conversation:', error);
        alert('Failed to unlock conversation');
    }
}

async function downloadConversation(id) {
    try {
        const response = await fetch(`${API_BASE}/conversations/${id}/download`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${id}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading conversation:', error);
        alert('Failed to download conversation');
    }
}

// ===== UTILITY FUNCTIONS =====
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== MODERATION ACTIONS =====
async function deleteReportedPost(postId, reportId) {
    if (!confirm('Are you sure you want to DELETE this post? This action cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/posts/${postId}`, {
            method: 'DELETE'
        });

        // Update report status to resolved
        await apiCall(`/reports/${reportId}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'resolved',
                notes: 'Post deleted by moderator'
            })
        });

        alert('Post deleted successfully');
        closeReportModal();
        loadView(currentView);
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
}

async function tempBanUser(userId, username, reportId) {
    const duration = prompt(
        `Temporarily ban @${username}?\n\nEnter ban duration in days (1-30):`,
        '7'
    );

    if (!duration) return;

    const days = parseInt(duration);
    if (isNaN(days) || days < 1 || days > 30) {
        alert('Invalid duration. Please enter a number between 1 and 30.');
        return;
    }

    if (!confirm(`Confirm: Ban @${username} for ${days} day(s)?`)) {
        return;
    }

    try {
        await apiCall(`/users/${userId}/tempban`, {
            method: 'POST',
            body: JSON.stringify({ duration: days })
        });

        // Update report status to resolved
        await apiCall(`/reports/${reportId}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'resolved',
                notes: `User temporarily banned for ${days} day(s)`
            })
        });

        alert(`@${username} has been temporarily banned for ${days} day(s)`);
        closeReportModal();
        loadView(currentView);
    } catch (error) {
        console.error('Error banning user:', error);
        alert('Failed to ban user');
    }
}

// Make functions globally available
window.viewReport = viewReport;
window.closeReportModal = closeReportModal;
window.assignReport = assignReport;
window.updateReportStatus = updateReportStatus;
window.addNotes = addNotes;
window.loadView = loadView;
window.viewConversation = viewConversation;
window.closeConversationModal = closeConversationModal;
window.unlockConversation = unlockConversation;
window.downloadConversation = downloadConversation;
window.deleteReportedPost = deleteReportedPost;
window.tempBanUser = tempBanUser;

