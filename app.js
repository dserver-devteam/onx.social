// API Base URL
let currentFeed = 'foryou'; // 'foryou' or 'latest'
const API_BASE = '/api';

// Current user
let currentUser = null;
let currentMedia = {
    quick: null,
    modal: null,
    reply: null
};

// ===== AI EXPLANATION =====
window.explainPost = async function (postId, content) {
    const modal = document.getElementById('aiExplainModal');
    const loading = document.getElementById('aiLoading');
    const result = document.getElementById('aiResult');

    modal.classList.add('active');
    loading.style.display = 'block';
    result.style.display = 'none';
    result.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/ai/explain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content.trim() })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to get explanation');

        loading.style.display = 'none';
        result.style.display = 'block';

        // Typewriter effect for the result
        const text = data.explanation;
        let i = 0;
        result.innerHTML = '';

        function typeWriter() {
            if (i < text.length) {
                result.innerHTML += text.charAt(i);
                i++;
                setTimeout(typeWriter, 10);
            }
        }
        typeWriter();

    } catch (error) {
        console.error('Error explaining post:', error);
        loading.style.display = 'none';
        result.style.display = 'block';
        result.innerHTML = `<div style="color: #ef4444; text-align: center;">
            <p>Failed to generate explanation.</p>
            <p style="font-size: 0.9em; opacity: 0.8;">${error.message}</p>
        </div>`;
    }
};

window.closeAiModal = function () {
    document.getElementById('aiExplainModal').classList.remove('active');
};

// ===== SMART RECOMMENDATIONS - VIEW TRACKING =====

// Track viewed posts
const viewedPosts = new Set();
let viewedPostsCount = 0;
let totalPostsLoaded = 0;

function initViewTracking() {
    if (!currentUser) return;

    // Mark all currently visible posts as viewed immediately
    document.querySelectorAll('.post-card').forEach(card => {
        const postId = card.dataset.postId;
        if (postId && !viewedPosts.has(postId)) {
            viewedPosts.add(postId);
            viewedPostsCount++;
            // Mark as viewed immediately (aggressive mode)
            markPostAsViewed(postId);
        }
    });

    // Auto-refresh removed - it was causing infinite reload loops
    // Users can manually refresh to see new posts
}

async function markPostAsViewed(postId) {
    if (!currentUser) return;

    console.log('📍 Marking post as viewed:', postId);

    try {
        await fetch(`${API_BASE}/posts/${postId}/mark-viewed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });
        console.log('✅ Post marked as viewed:', postId);
    } catch (error) {
        console.error('Error marking post as viewed:', error);
    }
}

async function updateUserPreferences(postId, interactionType) {
    if (!currentUser) return;

    try {
        await fetch(`${API_BASE}/preferences/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                post_id: postId,
                interaction_type: interactionType
            })
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
    }
}

// State
let posts = [];
let currentPage = 'home';
let notifications = [];
let bookmarks = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Check authentication
    const userStr = localStorage.getItem('user');

    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
            updateUserInfo();
            // Update login redirect to use clean route
            if (window.location.search.includes('login=success')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
            localStorage.removeItem('user');
            currentUser = null;
        }
    } else {
        currentUser = null;
        updateUserInfo(); // Will handle guest state
    }

    // Handle initial URL routing
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
        const username = path.split('/')[2];
        if (username) {
            // Navigate to profile immediately, don't load home feed
            navigateToPage('profile', username);
            // Still load trending and suggestions
            await loadTrending();
            if (currentUser) {
                await loadFollowSuggestions();
            }
        }
    } else if (path.startsWith('/hashtag/')) {
        const tag = path.split('/')[2];
        if (tag) {
            navigateToPage('hashtag', decodeURIComponent(tag));
            // Still load trending and suggestions
            await loadTrending();
            if (currentUser) {
                await loadFollowSuggestions();
            }
        }
    } else {
        // Load initial data for home page
        await loadPosts();
        await loadTrending();
        if (currentUser) {
            await loadFollowSuggestions();
        }
    }

    // Setup event listeners
    setupEventListeners();

    // Setup infinite scroll
    setupInfiniteScroll();

    // Check registration status for guests
    if (!currentUser) {
        checkRegistrationEnabled();
    }
}

// Check if registration is enabled
async function checkRegistrationEnabled() {
    try {
        const response = await fetch(`${API_BASE}/settings/registration`);
        if (!response.ok) throw new Error('Failed to fetch registration setting');

        const data = await response.json();
        const contextRegister = document.getElementById('contextRegister');
        const guestActions = document.getElementById('guestActions');

        // Update context menu registration option
        if (contextRegister) {
            contextRegister.style.display = data.enabled ? 'block' : 'none';
        }

        // Update guest actions registration link
        if (guestActions) {
            const registerLink = guestActions.querySelector('a[href="/register"]');
            if (registerLink) {
                registerLink.style.display = data.enabled ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Error checking registration status:', error);
        // Default to showing registration if API fails
    }
}

function updateUserInfo() {
    // Update sidebar profile
    const userNames = document.querySelectorAll('.user-name');
    const userHandles = document.querySelectorAll('.user-handle');
    const userAvatars = document.querySelectorAll('.user-avatar, .compose-avatar');
    const sidebarProfile = document.querySelector('.sidebar-profile');

    if (currentUser) {
        userNames.forEach(el => {
            if (el.textContent === 'You' || el.textContent === 'Guest') el.textContent = currentUser.display_name;
        });

        userHandles.forEach(el => {
            if (el.textContent === '@you' || el.textContent === '@guest') el.textContent = `@${currentUser.username}`;
        });

        userAvatars.forEach(el => {
            if (el.src.includes('seed=CurrentUser') || el.src.includes('seed=Guest')) {
                el.src = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`;
            }
        });

        // Ensure sidebar profile is visible and shows logout option if needed
        if (sidebarProfile) {
            sidebarProfile.style.display = 'flex';
            // Could add logout button logic here if not already present
        }

        const guestActions = document.getElementById('guestActions');
        if (guestActions) guestActions.style.display = 'none';

        // Logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = async (e) => {
                e.stopPropagation(); // Prevent profile click
                const confirmed = await showConfirmModal(
                    'Logout',
                    'Are you sure you want to logout?',
                    'Logout'
                );
                if (confirmed) {
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
            };
        }

    } else {
        // Guest State
        userNames.forEach(el => {
            if (el.textContent === 'You') el.textContent = 'Guest';
        });

        userHandles.forEach(el => {
            if (el.textContent === '@you') el.textContent = '@guest';
        });

        userAvatars.forEach(el => {
            if (el.src.includes('seed=CurrentUser')) {
                el.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=Guest`;
            }
        });

        // Hide sidebar profile for guest and show guest actions
        if (sidebarProfile) sidebarProfile.style.display = 'none';

        const guestActions = document.getElementById('guestActions');
        if (guestActions) guestActions.style.display = 'flex';
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPosts(e.target.value);
            }
        });
    }

    // Quick compose (in feed)
    const quickComposeInput = document.getElementById('quickComposeInput');
    const quickPostBtn = document.getElementById('quickPostBtn');
    const quickCharCounter = document.getElementById('quickCharCounter');

    if (quickComposeInput) {
        quickComposeInput.addEventListener('input', () => {
            updateCharCounter(quickComposeInput, quickCharCounter);
        });
    }

    if (quickPostBtn) {
        quickPostBtn.addEventListener('click', () => {
            createPost(quickComposeInput, quickCharCounter);
        });
    }

    // Modal compose
    const openComposeBtn = document.getElementById('openComposeBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const composeModal = document.getElementById('composeModal');
    const modalComposeInput = document.getElementById('modalComposeInput');
    const modalPostBtn = document.getElementById('modalPostBtn');
    const modalCharCounter = document.getElementById('modalCharCounter');

    if (openComposeBtn) {
        openComposeBtn.addEventListener('click', () => {
            composeModal.classList.add('active');
            modalComposeInput.focus();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            composeModal.classList.remove('active');
            modalComposeInput.value = '';
            updateCharCounter(modalComposeInput, modalCharCounter);
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            composeModal.classList.remove('active');
            modalComposeInput.value = '';
            updateCharCounter(modalComposeInput, modalCharCounter);
        });
    }

    if (modalComposeInput) {
        modalComposeInput.addEventListener('input', () => {
            updateCharCounter(modalComposeInput, modalCharCounter);
        });
    }

    if (modalPostBtn) {
        modalPostBtn.addEventListener('click', () => {
            createPost(modalComposeInput, modalCharCounter, () => {
                composeModal.classList.remove('active');
            });
        });
    }

    // Follow buttons
    document.querySelectorAll('.btn-follow').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.textContent === 'Follow') {
                this.textContent = 'Following';
                this.style.background = 'var(--color-primary)';
                this.style.color = 'white';
            } else {
                this.textContent = 'Follow';
                this.style.background = 'transparent';
                this.style.color = 'var(--color-primary)';
            }
        });
    });

    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            // Update active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Get page from text content
            const pageText = this.querySelector('span').textContent.toLowerCase();
            navigateToPage(pageText);
        });
    });

    // Context Menu for User Panel
    const sidebarProfile = document.querySelector('.sidebar-profile');
    const contextMenu = document.getElementById('userContextMenu');
    const contextSettings = document.getElementById('contextSettings');
    const contextLogout = document.getElementById('contextLogout');
    const contextRegister = document.getElementById('contextRegister');

    if (sidebarProfile && contextMenu) {
        // Right-click on user panel
        sidebarProfile.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            // Position context menu at cursor
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.display = 'block';

            // Show/hide registration option based on user state and setting
            if (!currentUser) {
                checkRegistrationEnabled();
            } else {
                contextRegister.style.display = 'none';
            }
        });

        // Settings option
        if (contextSettings) {
            contextSettings.addEventListener('click', () => {
                contextMenu.style.display = 'none';
                // Open settings modal
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    settingsModal.classList.add('active');
                }
            });
        }

        // Logout option
        if (contextLogout) {
            contextLogout.addEventListener('click', async () => {
                contextMenu.style.display = 'none';
                if (currentUser) {
                    const confirmed = await showConfirmModal(
                        'Logout',
                        'Are you sure you want to logout?',
                        'Logout'
                    );
                    if (confirmed) {
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                    }
                }
            });
        }

        // Registration option
        if (contextRegister) {
            contextRegister.addEventListener('click', () => {
                contextMenu.style.display = 'none';
                window.location.href = '/register';
            });
        }

        // Close context menu on outside click
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target) && !sidebarProfile.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });

        // Close context menu on scroll
        window.addEventListener('scroll', () => {
            contextMenu.style.display = 'none';
        });
    }

    // Setup post menu and report modal listeners
    setupPostMenuListeners();
    setupReportModalListeners();
}

// ===== NAVIGATION =====
function navigateToPage(page, param = null) {
    currentPage = page;

    // Update URL without reload
    let url = '/';
    if (page === 'profile' && param) {
        url = `/profile/${param}`;
    } else if (page === 'hashtag' && param) {
        url = `/hashtag/${param}`;
    } else if (page !== 'home') {
        url = `/#${page}`;
    }
    window.history.pushState({}, '', url);

    // Update feed header
    const feedHeader = document.querySelector('.main-header h1');
    if (feedHeader) {
        if (page === 'hashtag' && param) {
            feedHeader.textContent = `#${param}`;
        } else if (page === 'profile' && param) {
            feedHeader.textContent = `@${param}`;
        } else {
            feedHeader.textContent = page.charAt(0).toUpperCase() + page.slice(1);
        }
    }

    // Show/hide compose box and feed tabs based on page
    const composeBox = document.querySelector('.compose-box');
    const feedTabs = document.querySelector('.feed-tabs');

    if (page === 'home') {
        if (composeBox) composeBox.style.display = 'block';
        if (feedTabs) feedTabs.style.display = 'flex';
    } else {
        if (composeBox) composeBox.style.display = 'none';
        if (feedTabs) feedTabs.style.display = 'none';
    }

    // Reset pagination when changing pages
    resetPagination();

    // Clear and render appropriate content
    const postsFeed = document.getElementById('postsFeed');
    const socialPage = document.getElementById('socialPage');

    // Hide social page when navigating away
    if (socialPage && page !== 'social') {
        socialPage.style.display = 'none';
    }

    // Show feed for non-social pages
    if (postsFeed && page !== 'social') {
        postsFeed.style.display = 'block';
    }

    switch (page) {
        case 'home':
            loadPosts();
            break;
        case 'explore':
            renderExplorePage();
            break;
        case 'notifications':
            renderNotificationsPage();
            break;
        case 'social':
            renderSocialPage();
            break;
        case 'bookmarks':
            renderBookmarksPage();
            break;
        case 'profile':
            if (param) {
                renderUserProfilePage(param);
            } else {
                renderProfilePage();
            }
            break;
        case 'hashtag':
            if (param) {
                renderHashtagPage(param);
            }
            break;
        default:
            loadPosts();
    }
}

// Navigate to user profile
function navigateToUserProfile(event, username) {
    event.preventDefault();
    event.stopPropagation();

    // Use navigateToPage for consistent navigation
    navigateToPage('profile', username);
}

// Navigate to hashtag page
function navigateToHashtag(event, tag) {
    event.preventDefault();
    event.stopPropagation();

    // Update feed header
    const feedHeader = document.querySelector('.main-header h1');
    if (feedHeader) {
        feedHeader.textContent = `#${tag}`;
    }

    // Render hashtag page
    renderHashtagPage(tag);
}

// ===== CHARACTER COUNTER =====
function updateCharCounter(input, counter) {
    const length = input.value.length;
    const maxLength = 280;
    counter.textContent = `${length} / ${maxLength}`;

    if (length > maxLength * 0.9) {
        counter.style.color = 'var(--color-like)';
    } else {
        counter.style.color = 'var(--color-text-secondary)';
    }
}

// ===== API CALLS =====

// Helper to show custom confirmation modal
function showConfirmModal(title, message, confirmText = 'Confirm') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('confirmModalTitle');
        const modalMessage = document.getElementById('confirmModalMessage');
        const confirmBtn = document.getElementById('confirmModalConfirmBtn');
        const cancelBtn = document.getElementById('confirmModalCancelBtn');
        const closeBtn = document.getElementById('closeConfirmModalBtn');
        const overlay = document.getElementById('confirmModalOverlay');

        if (!modal) {
            // Fallback if modal not found
            resolve(confirm(message));
            return;
        }

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        confirmBtn.textContent = confirmText;

        const close = (result) => {
            modal.classList.remove('active');
            // Remove event listeners to prevent memory leaks/multiple bindings
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            overlay.onclick = null;
            resolve(result);
        };

        confirmBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        closeBtn.onclick = () => close(false);
        overlay.onclick = () => close(false);

        modal.classList.add('active');
    });
}

// Show custom alert modal (replaces browser alert)
function showAlertModal(message, title = 'Notice') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('confirmModalTitle');
        const modalMessage = document.getElementById('confirmModalMessage');
        const confirmBtn = document.getElementById('confirmModalConfirmBtn');
        const cancelBtn = document.getElementById('confirmModalCancelBtn');

        if (!modal) {
            alert(message); // Fallback
            resolve();
            return;
        }

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        confirmBtn.textContent = 'OK';

        // Hide cancel button for alerts
        if (cancelBtn) cancelBtn.style.display = 'none';

        const handleConfirm = () => {
            modal.classList.remove('active');
            if (cancelBtn) cancelBtn.style.display = ''; // Restore
            confirmBtn.onclick = null;
            resolve();
        };

        confirmBtn.onclick = handleConfirm;
        modal.classList.add('active');
    });
}

// Helper to check auth and prompt login
async function requireAuth() {
    if (!currentUser) {
        const confirmed = await showConfirmModal(
            'Sign In Required',
            'You need to be logged in to perform this action. Would you like to sign in?',
            'Sign In'
        );

        if (confirmed) {
            window.location.href = '/login';
        }
        return false;
    }
    return true;
}

// Infinite scroll state
let postsOffset = 0;
let isLoadingPosts = false;
let hasMorePosts = true;
const POSTS_PER_PAGE = 20;

// Load posts from API
async function loadPosts(append = false) {
    const feedContainer = document.getElementById('postsFeed');

    // Prevent multiple simultaneous loads
    if (isLoadingPosts) return;

    // Don't load if we know there are no more posts
    if (append && !hasMorePosts) return;

    isLoadingPosts = true;

    // Show loading indicator
    if (append) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.id = 'loadingMore';
        loadingDiv.textContent = 'Loading more posts...';
        feedContainer.appendChild(loadingDiv);
    }

    try {
        let url = `${API_BASE}/posts?limit=${POSTS_PER_PAGE}&offset=${postsOffset}`;

        // Add current_user_id to enable smart recommendations (view exclusion)
        if (currentUser) {
            url += `&current_user_id=${currentUser.id}`;
        }

        if (currentFeed === 'foryou' && currentUser) {
            url = `${API_BASE}/feed/recommended?user_id=${currentUser.id}&limit=${POSTS_PER_PAGE}&offset=${postsOffset}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch posts');

        const newPosts = await response.json();

        // Check if we got fewer posts than requested (means no more posts)
        if (newPosts.length < POSTS_PER_PAGE) {
            hasMorePosts = false;
        }

        if (append) {
            // Append new posts to existing array
            posts = [...posts, ...newPosts];
            // Remove loading indicator
            const loadingDiv = document.getElementById('loadingMore');
            if (loadingDiv) loadingDiv.remove();

            // Append new posts to DOM
            if (newPosts.length > 0) {
                const newPostsHTML = newPosts.map(post => createPostHTML(post)).join('');
                feedContainer.insertAdjacentHTML('beforeend', newPostsHTML);
                attachPostEventListeners();
            }
        } else {
            // Replace posts (initial load or refresh)
            posts = newPosts;

            // Reset viewed counter when loading fresh feed
            viewedPostsCount = 0;
            totalPostsLoaded = newPosts.length;

            if (posts.length === 0) {
                feedContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                        <p>No posts yet. Be the first to post!</p>
                    </div>
                `;
                hasMorePosts = false;
                return;
            }

            feedContainer.innerHTML = posts.map(post => createPostHTML(post)).join('');
            attachPostEventListeners();

            // Initialize view tracking for newly loaded posts
            initViewTracking();
        }

        // Update offset for next load
        postsOffset += newPosts.length;

        // Update total posts loaded
        if (append) {
            totalPostsLoaded += newPosts.length;
        }

    } catch (error) {
        console.error('Error loading posts:', error);

        // Remove loading indicator if it exists
        const loadingDiv = document.getElementById('loadingMore');
        if (loadingDiv) loadingDiv.remove();

        if (!append) {
            feedContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <p>Failed to load posts. Please try again later.</p>
                </div>
            `;
        }
    } finally {
        isLoadingPosts = false;
    }
}

// Reset pagination state
function resetPagination() {
    postsOffset = 0;
    hasMorePosts = true;
    posts = [];
}

// Setup infinite scroll
function setupInfiniteScroll() {
    let scrollTimeout;

    window.addEventListener('scroll', () => {
        // Debounce scroll event
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Only trigger infinite scroll on home page
            if (currentPage !== 'home') return;

            // Get the posts feed element to check if we're near the bottom
            const postsFeed = document.getElementById('postsFeed');
            if (!postsFeed) return;

            // Calculate distances
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            // Check if we're within 800px of the bottom
            if (documentHeight - (scrollTop + windowHeight) < 800) {
                // Load more posts
                loadPosts(true);
            }
        }, 100); // 100ms debounce
    });
}

// Search functionality
async function searchPosts(query) {
    const feedContainer = document.getElementById('postsFeed');
    const feedTitle = document.querySelector('.feed-header h2');

    if (!query) return loadPosts();

    try {
        feedContainer.innerHTML = '<div class="loading-spinner"></div>';
        if (feedTitle) feedTitle.textContent = `Search: ${query}`;

        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        const { posts, users } = data;

        let html = '';

        // Render Users
        if (users.length > 0) {
            html += `
                <div class="search-section">
                    <h3 style="padding: 15px; font-size: 1.1rem; font-weight: 700; border-bottom: 1px solid var(--color-border);">People</h3>
                    ${users.map(user => `
                        <div class="user-card" onclick="window.location.href='/profile/${user.username}'" style="cursor: pointer; padding: 15px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
                            <img src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" alt="${user.display_name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                            <div style="flex: 1;">
                                <div style="font-weight: 700; color: var(--color-text-primary);">${user.display_name}</div>
                                <div style="color: var(--color-text-secondary);">@${user.username}</div>
                                ${user.bio ? `<div style="font-size: 0.9rem; color: var(--color-text-primary); margin-top: 4px;">${user.bio}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Render Posts
        if (posts.length > 0) {
            html += `
                <div class="search-section">
                    <h3 style="padding: 15px; font-size: 1.1rem; font-weight: 700; border-bottom: 1px solid var(--color-border);">Posts</h3>
                    ${posts.map(post => createPostHTML(post)).join('')}
                </div>
            `;
        } else if (users.length === 0) {
            html = `
                <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                    <p>No results found for "${query}"</p>
                </div>
            `;
        }

        feedContainer.innerHTML = html;
        attachPostEventListeners();

        // Initialize view tracking for newly loaded posts
        initViewTracking();

    } catch (error) {
        console.error('Search error:', error);
        feedContainer.innerHTML = `
                < div style = "text-align: center; padding: 40px; color: #ef4444;" >
                    <p>Failed to perform search. Please try again.</p>
            </div >
                `;
    }
}

// Create a new post
async function createPost(input, counter, callback) {
    if (!(await requireAuth())) return;

    const content = input.value.trim();
    const inputId = input.id;
    const mediaType = inputId.includes('quick') ? 'quick' : inputId.includes('modal') ? 'modal' : 'reply';

    if (!content) {
        showAlertModal('Please enter some content');
        return;
    }

    if (content.length > 280) {
        showAlertModal('Post is too long (max 280 characters)');
        return;
    }

    try {
        const postData = {
            user_id: currentUser.id,
            content: content
        };

        // Add media if present
        if (currentMedia[mediaType]) {
            postData.media_url = currentMedia[mediaType].url;
            postData.media_type = currentMedia[mediaType].type;
        }

        const response = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) throw new Error('Failed to create post');

        // Clear input and media
        input.value = '';
        updateCharCounter(input, counter);
        removeMedia(mediaType);

        // Reset pagination and reload posts
        resetPagination();
        await loadPosts();

        // Callback (e.g., close modal)
        if (callback) callback();

    } catch (error) {
        console.error('Error creating post:', error);
        showAlertModal('Failed to create post. Please try again.', 'Error');
    }
}

// Toggle like on a post
async function toggleLike(postId, button) {
    if (!(await requireAuth())) return;
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        if (!response.ok) throw new Error('Failed to toggle like');

        const data = await response.json();

        // Update UI
        const countSpan = button.querySelector('.action-count');
        let currentCount = parseInt(countSpan.textContent) || 0;

        if (data.liked) {
            button.classList.add('liked');
            countSpan.textContent = currentCount + 1;
        } else {
            button.classList.remove('liked');
            countSpan.textContent = Math.max(0, currentCount - 1);
        }

    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Toggle repost
async function toggleRepost(postId, button) {
    if (!(await requireAuth())) return;
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/repost`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        if (!response.ok) throw new Error('Failed to toggle repost');

        const data = await response.json();

        // Update UI
        const countSpan = button.querySelector('.action-count');
        let currentCount = parseInt(countSpan.textContent) || 0;

        if (data.reposted) {
            button.classList.add('reposted');
            countSpan.textContent = currentCount + 1;
        } else {
            button.classList.remove('reposted');
            countSpan.textContent = Math.max(0, currentCount - 1);
        }

    } catch (error) {
        console.error('Error toggling repost:', error);
    }
}

// Toggle bookmark
async function toggleBookmark(postId, button) {
    if (!(await requireAuth())) return;
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/bookmark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        if (!response.ok) throw new Error('Failed to toggle bookmark');

        const data = await response.json();

        // Update UI
        if (data.bookmarked) {
            button.classList.add('bookmarked');
            button.querySelector('svg').setAttribute('fill', 'currentColor');
        } else {
            button.classList.remove('bookmarked');
            button.querySelector('svg').setAttribute('fill', 'none');
        }

    } catch (error) {
        console.error('Error toggling bookmark:', error);
    }
}

// ===== POST MENU =====
let currentPostMenuData = { postId: null, authorId: null, authorUsername: null };

// Toggle post menu
function togglePostMenu(event, postId, authorId, authorUsername, content) {
    event.stopPropagation();
    const postMenu = document.getElementById('postMenu');
    const muteUsername = document.getElementById('muteUsername');

    // Store current post data
    currentPostMenuData = { postId, authorId, authorUsername, content };

    // Update mute username
    if (muteUsername) {
        muteUsername.textContent = authorUsername;
    }

    // Hide mute option if viewing own post
    const muteMenuItem = document.getElementById('muteUserMenuItem');
    if (muteMenuItem && currentUser && authorId == currentUser.id) {
        muteMenuItem.style.display = 'none';
    } else if (muteMenuItem) {
        muteMenuItem.style.display = 'flex';
    }

    // Show delete option only for own posts
    const deleteMenuItem = document.getElementById('deletePostMenuItem');
    if (deleteMenuItem && currentUser && authorId == currentUser.id) {
        deleteMenuItem.style.display = 'flex';
    } else if (deleteMenuItem) {
        deleteMenuItem.style.display = 'none';
    }

    // Position menu at click location
    postMenu.style.left = `${event.clientX}px`;
    postMenu.style.top = `${event.clientY}px`;
    postMenu.style.display = 'block';
}

// Setup post menu listeners (call once on page load)
function setupPostMenuListeners() {
    const postMenu = document.getElementById('postMenu');
    const reportMenuItem = document.getElementById('reportPostMenuItem');
    const muteMenuItem = document.getElementById('muteUserMenuItem');
    const copyLinkMenuItem = document.getElementById('copyLinkMenuItem');
    const deleteMenuItem = document.getElementById('deletePostMenuItem');
    const explainAiMenuItem = document.getElementById('explainAiMenuItem');

    if (!postMenu) return;

    // Delete post
    if (deleteMenuItem) {
        deleteMenuItem.addEventListener('click', async () => {
            postMenu.style.display = 'none';
            if (!(await requireAuth())) return;

            const confirmed = await showConfirmModal(
                'Delete Post',
                'Are you sure you want to delete this post? This action cannot be undone.',
                'Delete'
            );

            if (confirmed) {
                await deletePost(currentPostMenuData.postId);
            }
        });
    }

    // Explain with AI
    if (explainAiMenuItem) {
        explainAiMenuItem.addEventListener('click', () => {
            postMenu.style.display = 'none';
            // Use the stored content (strip HTML tags if needed, but explainPost handles it)
            // We need to strip the HTML tags we added in linkifyContent
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentPostMenuData.content;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            explainPost(currentPostMenuData.postId, plainText);
        });
    }

    // Report post
    if (reportMenuItem) {
        reportMenuItem.addEventListener('click', async () => {
            postMenu.style.display = 'none';
            if (!(await requireAuth())) return;
            openReportModal(currentPostMenuData.postId);
        });
    }

    // Mute user
    if (muteMenuItem) {
        muteMenuItem.addEventListener('click', async () => {
            postMenu.style.display = 'none';
            if (!(await requireAuth())) return;
            await muteUser(currentPostMenuData.authorId, currentPostMenuData.authorUsername);
        });
    }

    // Copy link
    if (copyLinkMenuItem) {
        copyLinkMenuItem.addEventListener('click', async () => {
            postMenu.style.display = 'none';
            const postUrl = `${window.location.origin}/post/${currentPostMenuData.postId}`;
            try {
                await navigator.clipboard.writeText(postUrl);
                alert('Link copied to clipboard!');
            } catch (error) {
                console.error('Failed to copy:', error);
                showAlertModal('Failed to copy link', 'Error');
            }
        });
    }

    // Close menu on outside click
    document.addEventListener('click', (e) => {
        if (!postMenu.contains(e.target) && !e.target.closest('.post-menu-btn')) {
            postMenu.style.display = 'none';
        }
    });

    // Close menu on scroll
    window.addEventListener('scroll', () => {
        postMenu.style.display = 'none';
    });
}

// Mute user
async function muteUser(userId, username) {
    try {
        const confirmed = await showConfirmModal(
            'Mute User',
            `Are you sure you want to mute @${username}? You won't see their posts in your feed.`,
            'Mute'
        );

        if (!confirmed) return;

        const response = await fetch(`${API_BASE}/users/${userId}/mute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        if (!response.ok) throw new Error('Failed to mute user');

        showAlertModal(`@${username} has been muted. Refresh to see changes.`, 'Success');

        // Optionally reload posts
        resetPagination();
        await loadPosts();

    } catch (error) {
        console.error('Error muting user:', error);
        showAlertModal('Failed to mute user', 'Error');
    }
}

// Open report modal
function openReportModal(postId) {
    const reportModal = document.getElementById('reportModal');
    const reportReason = document.getElementById('reportReason');
    const reportDescription = document.getElementById('reportDescription');

    // Reset form
    if (reportReason) reportReason.value = 'spam';
    if (reportDescription) reportDescription.value = '';

    // Store post ID for submission
    reportModal.dataset.postId = postId;

    // Show modal
    reportModal.classList.add('active');
}

// Setup report modal listeners
function setupReportModalListeners() {
    const reportModal = document.getElementById('reportModal');
    const closeReportModalBtn = document.getElementById('closeReportModalBtn');
    const reportModalOverlay = document.getElementById('reportModalOverlay');
    const submitReportBtn = document.getElementById('submitReportBtn');

    if (closeReportModalBtn) {
        closeReportModalBtn.addEventListener('click', () => {
            reportModal.classList.remove('active');
        });
    }

    if (reportModalOverlay) {
        reportModalOverlay.addEventListener('click', () => {
            reportModal.classList.remove('active');
        });
    }

    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', async () => {
            await submitReport();
        });
    }
}

// Submit report
async function submitReport() {
    const reportModal = document.getElementById('reportModal');
    const postId = reportModal.dataset.postId;
    const reason = document.getElementById('reportReason').value;
    const description = document.getElementById('reportDescription').value;

    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                reason,
                description
            })
        });

        if (!response.ok) throw new Error('Failed to submit report');

        reportModal.classList.remove('active');
        showAlertModal('Report submitted successfully. Thank you for helping keep our community safe.', 'Success');

    } catch (error) {
        console.error('Error submitting report:', error);
        showAlertModal('Failed to submit report. Please try again.', 'Error');
    }
}

// Load trending topics
async function loadTrending() {
    try {
        const response = await fetch(`${API_BASE}/trending`);
        if (!response.ok) throw new Error('Failed to fetch trending');

        const trending = await response.json();
        renderTrending(trending);
    } catch (error) {
        console.error('Error loading trending:', error);
    }
}

// Load follow suggestions
async function loadFollowSuggestions() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}/suggested-follows`);
        if (!response.ok) throw new Error('Failed to fetch follow suggestions');

        const suggestions = await response.json();
        renderFollowSuggestions(suggestions);
    } catch (error) {
        console.error('Error loading follow suggestions:', error);
    }
}

// Render follow suggestions
function renderFollowSuggestions(suggestions) {
    const container = document.querySelector('.follow-suggestions');
    if (!container) return;

    if (!suggestions || suggestions.length === 0) {
        container.innerHTML = '<div class="loading" style="padding: 15px; text-align: center; color: var(--color-text-secondary);">No suggestions available</div>';
        return;
    }

    container.innerHTML = suggestions.map(user => `
        <div class="follow-item">
            <img src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" alt="${user.display_name}" class="follow-avatar">
            <div class="follow-info">
                <div class="follow-name">${user.display_name}</div>
                <div class="follow-handle">@${user.username}</div>
                ${user.follower_count ? `<div style="font-size: 0.75rem; color: var(--color-text-tertiary);">${user.follower_count} followers</div>` : ''}
            </div>
            <button class="btn-follow" data-user-id="${user.id}">Follow</button>
        </div>
    `).join('');

    // Add event listeners to follow buttons
    container.querySelectorAll('.btn-follow').forEach(btn => {
        btn.addEventListener('click', async function () {
            const userId = this.dataset.userId;
            await toggleFollow(userId, this);
        });
    });
}

// Toggle follow
async function toggleFollow(userId, button) {
    if (!(await requireAuth())) return;

    try {
        const isFollowing = button.textContent === 'Following';

        if (isFollowing) {
            // Unfollow
            const response = await fetch(`${API_BASE}/users/${userId}/follow?user_id=${currentUser.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to unfollow');

            button.textContent = 'Follow';
            button.style.background = 'transparent';
            button.style.color = 'var(--color-primary)';
        } else {
            // Follow
            const response = await fetch(`${API_BASE}/users/${userId}/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: currentUser.id
                })
            });

            if (!response.ok) throw new Error('Failed to follow');

            button.textContent = 'Following';
            button.style.background = 'var(--color-primary)';
            button.style.color = 'white';
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
    }
}

// ===== RENDERING =====

// Render posts to the feed
function renderPosts() {
    const feed = document.getElementById('postsFeed');

    if (posts.length === 0) {
        feed.innerHTML = '<div class="loading">No posts yet. Be the first to post!</div>';
        return;
    }

    feed.innerHTML = posts.map(post => createPostHTML(post)).join('');

    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn[data-action="like"]').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.dataset.postId;
            toggleLike(postId, this);
        });
    });

    document.querySelectorAll('.action-btn[data-action="repost"]').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.dataset.postId;
            toggleRepost(postId, this);
        });
    });

    document.querySelectorAll('.action-btn[data-action="reply"]').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.dataset.postId;
            openReplyModal(postId);
        });
    });

    document.querySelectorAll('.action-btn[data-action="share"]').forEach(btn => {
        btn.addEventListener('click', async function () {
            const postId = this.dataset.postId;
            const postUrl = `${window.location.origin}/post/${postId}`;

            try {
                await navigator.clipboard.writeText(postUrl);
                // Show temporary success message
                const originalHTML = this.innerHTML;
                this.innerHTML = '<span style="font-size: 0.75rem;">✓ Copied!</span>';
                this.style.color = 'var(--color-success)';
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.style.color = '';
                }, 2000);
            } catch (error) {
                console.error('Failed to copy:', error);
                showAlertModal('Failed to copy link', 'Error');
            }
        });
    });
}

// Create HTML for a single post
function createPostHTML(post) {
    const timeAgo = getTimeAgo(new Date(post.created_at));

    // Media HTML
    let mediaHTML = '';
    if (post.media_url) {
        console.log('Post has media:', post.media_url, 'type:', post.media_type);
        if (post.media_type === 'image') {
            mediaHTML = `<div class="post-media"><img src="${post.media_url}" alt="Post image" onerror="console.error('Failed to load image:', this.src)"></div>`;
        } else if (post.media_type === 'video') {
            mediaHTML = `<div class="post-media"><video controls src="${post.media_url}"></video></div>`;
        }
    }

    return `
        <div class="post-card" data-post-id="${post.id}">
            <img src="${post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}`}" alt="${post.display_name}" class="post-avatar" onclick="navigateToUserProfile(event, '${post.username}')">
            <div class="post-content">
                <div class="post-header">
                    <span class="post-author" onclick="navigateToUserProfile(event, '${post.username}')">${post.display_name}</span>
                    <span class="post-username" onclick="navigateToUserProfile(event, '${post.username}')">@${post.username}</span>
                    <span class="post-time">· ${timeAgo}</span>
                </div>
                <div class="post-text">${linkifyContent(post.content)}</div>
                ${mediaHTML}
                <div class="post-actions">
                    <button class="action-btn" data-action="reply" data-post-id="${post.id}">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="action-count">${post.reply_count || 0}</span>
                    </button>
                    <button class="action-btn ${post.user_reposted ? 'reposted' : ''}" data-action="repost" data-post-id="${post.id}">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M17 1L21 5L17 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3 11V9C3 7.93913 3.42143 6.92172 4.17157 6.17157C4.92172 5.42143 5.93913 5 7 5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M7 23L3 19L7 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M21 13V15C21 16.0609 20.5786 17.0783 19.8284 17.8284C19.0783 18.5786 18.0609 19 17 19H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="action-count">${post.repost_count || 0}</span>
                    </button>
                    <button class="action-btn ${post.user_liked ? 'liked' : ''}" data-action="like" data-post-id="${post.id}">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7564 5.72718 21.351 5.12075 20.84 4.61Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="action-count">${post.like_count || 0}</span>
                    </button>
                    <button class="action-btn ${post.user_bookmarked ? 'bookmarked' : ''}" data-action="bookmark" data-post-id="${post.id}">
                        <svg viewBox="0 0 24 24" fill="${post.user_bookmarked ? 'currentColor' : 'none'}">
                            <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="action-btn" data-action="share" data-post-id="${post.id}">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16 6L12 2L8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 2V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="action-btn post-menu-btn" data-action="menu" data-post-id="${post.id}" data-author-id="${post.user_id}" data-author-username="${post.username}" data-content="${linkifyContent(post.content).replace(/"/g, '&quot;')}">
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="5" r="2" fill="currentColor"/>
                            <circle cx="12" cy="12" r="2" fill="currentColor"/>
                            <circle cx="12" cy="19" r="2" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render trending topics
function renderTrending(trending) {
    const trendingList = document.getElementById('trendingList');

    if (!trending || trending.length === 0) {
        trendingList.innerHTML = '<div class="loading">No trending topics</div>';
        return;
    }

    trendingList.innerHTML = trending.map((item, index) => `
        <div class="trending-item" onclick="navigateToHashtag(event, '${item.topic}')" style="cursor: pointer;">
            <div class="trending-category">Trending · Technology</div>
            <div class="trending-topic">#${item.topic}</div>
            <div class="trending-count">${item.count} post${item.count !== 1 ? 's' : ''}</div>
        </div>
    `).join('');
}

// ===== UTILITY FUNCTIONS =====

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval}${unit.charAt(0)}`;
        }
    }

    return 'now';
}

// Escape HTML to prevent XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Linkify mentions and hashtags in post content
function linkifyContent(text) {
    // First escape HTML to prevent XSS
    let escaped = escapeHTML(text);

    // Replace @mentions with clickable links
    escaped = escaped.replace(/@(\w+)/g, '<a href="#" class="mention" data-username="$1" onclick="navigateToUserProfile(event, \'$1\')">@$1</a>');

    // Replace #hashtags with clickable links
    escaped = escaped.replace(/#(\w+)/g, '<a href="#" class="hashtag" data-tag="$1" onclick="navigateToHashtag(event, \'$1\')">#$1</a>');

    return escaped;
}

// ===== PAGE RENDERERS =====

// Render Explore page
function renderExplorePage() {
    const feed = document.getElementById('postsFeed');
    feed.innerHTML = `
        <div class="explore-search-overlay" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 600px;
            z-index: 100;
            animation: fadeInScale 0.3s ease-out;
        ">
            <div style="
                background: var(--color-bg-secondary);
                border-radius: var(--radius-xl);
                padding: var(--spacing-xl);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid var(--color-border);
            ">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color: var(--color-primary);">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" />
                        <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    <input 
                        type="text" 
                        id="exploreSearchInput"
                        placeholder="Search N.Social" 
                        style="
                            flex: 1;
                            background: transparent;
                            border: none;
                            outline: none;
                            font-size: 1.25rem;
                            color: var(--color-text-primary);
                        "
                        autofocus
                    >
                </div>
                <div id="exploreSearchResults" style="max-height: 400px; overflow-y: auto;"></div>
            </div>
        </div>
        <div class="explore-overlay-backdrop" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 99;
            animation: fadeIn 0.3s ease-out;
        " onclick="navigateToPage('home')"></div>
    `;

    // Add search functionality
    const searchInput = document.getElementById('exploreSearchInput');
    const searchResults = document.getElementById('exploreSearchResults');
    let searchTimeout;

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();

        clearTimeout(searchTimeout);

        if (!query) {
            searchResults.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
                if (!response.ok) throw new Error('Search failed');

                const data = await response.json();
                const { posts: searchPosts, users } = data;

                let html = '';

                // Show top 3 results
                if (users.length > 0) {
                    html += `<div style="margin-bottom: 16px;">
                        <h4 style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">People</h4>
                        ${users.slice(0, 3).map(user => `
                            <div onclick="window.location.href='/profile/${user.username}'" style="
                                padding: 12px;
                                border-radius: var(--radius-md);
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 12px;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <img src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                                     style="width: 40px; height: 40px; border-radius: 50%;">
                                <div>
                                    <div style="font-weight: 600;">${user.display_name}</div>
                                    <div style="font-size: 0.875rem; color: var(--color-text-secondary);">@${user.username}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>`;
                }

                if (searchPosts.length > 0) {
                    html += `<div>
                        <h4 style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Posts</h4>
                        ${searchPosts.slice(0, 3).map(post => `
                            <div onclick="window.location.href='/post/${post.id}'" style="
                                padding: 12px;
                                border-radius: var(--radius-md);
                                cursor: pointer;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <div style="font-weight: 600; margin-bottom: 4px;">@${post.username}</div>
                                <div style="font-size: 0.875rem; color: var(--color-text-secondary);">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
                            </div>
                        `).join('')}
                    </div>`;
                }

                if (html === '') {
                    html = '<div style="text-align: center; padding: 20px; color: var(--color-text-secondary);">No results found</div>';
                }

                searchResults.innerHTML = html;
            } catch (error) {
                console.error('Search error:', error);
                searchResults.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--color-like);">Search failed</div>';
            }
        }, 300);
    });

    // Re-attach event listeners
    attachPostEventListeners();
}

// Render Notifications page
async function renderNotificationsPage() {
    if (!(await requireAuth())) return;

    const feed = document.getElementById('postsFeed');
    feed.innerHTML = '<div class="loading">Loading notifications...</div>';

    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}/notifications`);
        if (!response.ok) throw new Error('Failed to fetch notifications');

        const notifications = await response.json();

        if (notifications.length === 0) {
            feed.innerHTML = `
                <div style="padding: var(--spacing-xl); text-align: center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin: 0 auto var(--spacing-lg); color: var(--color-text-tertiary);">
                        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h2 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-md);">No notifications yet</h2>
                    <p style="color: var(--color-text-secondary);">
                        When someone likes, reposts, or replies to your posts, you'll see it here.
                    </p>
                </div>
            `;
            return;
        }

        feed.innerHTML = `
            <div class="page-content">
                ${notifications.map(notif => {
            const timeAgo = getTimeAgo(new Date(notif.created_at));
            let actionText = '';
            let icon = '';

            switch (notif.type) {
                case 'like':
                    actionText = 'liked your post';
                    icon = '❤️';
                    break;
                case 'repost':
                    actionText = 'reposted your post';
                    icon = '🔁';
                    break;
                case 'reply':
                    actionText = 'replied to your post';
                    icon = '💬';
                    break;
                case 'follow':
                    actionText = 'started following you';
                    icon = '👤';
                    break;
                case 'message_request':
                    actionText = 'sent you a message request';
                    icon = '✉️';
                    break;
                case 'message_unlock':
                    actionText = 'Your conversation was unlocked by support';
                    icon = '🔓';
                    break;
            }

            return `
                        <div class="post-card" style="${!notif.read ? 'background: rgba(29, 161, 242, 0.05);' : ''}" onclick="${notif.type === 'message_request' ? 'navigateToPage(\'messages\')' : ''}">
                            <img src="${notif.actor_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor_username}`}" 
                                 alt="${notif.actor_display_name}" 
                                 class="post-avatar"
                                 onclick="navigateToUserProfile(event, '${notif.actor_username}')">
                            <div class="post-content">
                                <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                                    <span style="font-size: 1.5rem;">${icon}</span>
                                    <span class="post-author" onclick="navigateToUserProfile(event, '${notif.actor_username}')">${notif.actor_display_name}</span>
                                    <span class="post-username">@${notif.actor_username}</span>
                                    <span class="post-time">· ${timeAgo}</span>
                                </div>
                                <div style="color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">
                                    ${actionText}
                                </div>
                                ${notif.post_content ? `
                                    <div style="padding: var(--spacing-md); background: var(--color-bg-tertiary); border-radius: var(--radius-md); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                        ${notif.post_content.substring(0, 100)}${notif.post_content.length > 100 ? '...' : ''}
                                    </div>
                                ` : ''}
                                ${notif.message ? `
                                    <div style="padding: var(--spacing-md); background: var(--color-bg-tertiary); border-radius: var(--radius-md); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                        ${notif.message}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;

        // Mark all as read
        await fetch(`${API_BASE}/notifications/read-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });

    } catch (error) {
        console.error('Error loading notifications:', error);
        feed.innerHTML = `
            <div class="loading" style="color: var(--color-like);">
                Failed to load notifications.
            </div>
        `;
    }
}

// Render Messages page
// ===== SOCIAL FEATURE =====

// ===== SOCIAL FEATURE (FRIENDS HUB) =====

async function renderSocialPage() {
    if (!(await requireAuth())) return;

    // Hide feed, show social page
    const feed = document.getElementById('postsFeed');
    const socialPage = document.getElementById('socialPage');

    if (feed) feed.style.display = 'none';
    if (socialPage) {
        socialPage.style.display = 'flex';

        // Load friends and feed
        await loadFriendsList();
        await loadStatusGrid();
    }
}

// Load mutual followers (Friends)
async function loadFriendsList() {
    try {
        const response = await fetch(`${API_BASE}/social/matches?user_id=${currentUser.id}`);
        if (!response.ok) throw new Error('Failed to fetch friends');

        const friends = await response.json();
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;

        if (friends.length === 0) {
            friendsList.innerHTML = `
                <div style="padding: var(--spacing-md); text-align: center; color: var(--color-text-secondary);">
                    <p>No friends yet</p>
                    <p style="font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">
                        Follow people and when they follow you back, they'll appear here!
                    </p>
                </div>
            `;
            return;
        }

        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-card-vertical" onclick="navigateToUserProfile(event, '${friend.username}')">
                <img src="${friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}" 
                     alt="${friend.display_name}" 
                     class="friend-avatar-large">
                <div class="friend-name-vertical">${friend.display_name.split(' ')[0]}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading friends:', error);
        const friendsList = document.getElementById('friendsList');
        if (friendsList) {
            friendsList.innerHTML = '<div class="loading" style="color: var(--color-like);">Failed to load friends</div>';
        }
    }
}

// Load Status Grid (Stories)
async function loadStatusGrid() {
    const grid = document.getElementById('statusGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Loading stories...</div>';

    try {
        // 1. Get Current User's Latest Post (My Status)
        const myPostsResponse = await fetch(`${API_BASE}/posts?user_id=${currentUser.id}&limit=1`);
        const myPosts = await myPostsResponse.json();
        const myLatestPost = myPosts.length > 0 ? myPosts[0] : null;

        // 2. Get Friends' Posts
        const friendsResponse = await fetch(`${API_BASE}/social/feed?user_id=${currentUser.id}`);
        const friendPosts = await friendsResponse.json();

        // Group by user to show only latest status per friend (optional, but good for stories)
        // For now, we'll just show the feed items as cards

        let html = '';

        // --- My Status Card ---
        if (myLatestPost) {
            html += createStatusCardHTML(myLatestPost, true);
        } else {
            // "Add Status" Card
            html += `
                <div class="status-card my-status" onclick="openComposeModal()">
                    <div class="add-status-icon">+</div>
                    <div style="font-weight: 600; color: var(--color-text-primary);">Add to Story</div>
                </div>
            `;
        }

        // --- Friends' Status Cards ---
        if (friendPosts.length === 0 && !myLatestPost) {
            grid.innerHTML = `
                <div class="status-card my-status" onclick="openComposeModal()">
                    <div class="add-status-icon">+</div>
                    <div style="font-weight: 600; color: var(--color-text-primary);">Add to Story</div>
                </div>
                <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-xl); color: var(--color-text-secondary);">
                    <p>No stories yet</p>
                </div>
            `;
            return;
        }

        html += friendPosts.map(post => createStatusCardHTML(post, false)).join('');
        grid.innerHTML = html;

    } catch (error) {
        console.error('Error loading status grid:', error);
        grid.innerHTML = '<div class="loading" style="color: var(--color-like);">Failed to load stories</div>';
    }
}

function createStatusCardHTML(post, isMine) {
    const hasMedia = post.media_url && post.media_type === 'image';
    // Use media as background if available, otherwise use avatar as fallback background
    const bgStyle = hasMedia
        ? `background-image: url('${post.media_url}'); background-size: cover; background-position: center;`
        : `background-color: var(--color-card); display: flex; align-items: center; justify-content: center;`;

    const contentPreview = post.content || (hasMedia ? '📷 Image' : '');

    return `
        <div class="status-card" onclick='openStatus(${JSON.stringify(post).replace(/'/g, "&#39;")})'>
            ${hasMedia ? `<div class="status-card-bg" style="background-image: url('${post.media_url}')"></div>` :
            `<div class="status-card-bg" style="background-color: var(--color-bg); opacity: 0.1;"></div>
               <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 10px; text-align: center; font-size: 12px; color: var(--color-text-secondary);">
                  ${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}
               </div>`
        }
            
            <div class="status-card-content">
                <img src="${post.avatar_url || post.user_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.username}" class="status-user-avatar" alt="${post.username}">
                <div class="status-username">${isMine ? 'Your Story' : post.display_name}</div>
            </div>
        </div>
    `;
}

// Open Status Modal
window.openStatus = function (post) {
    const modal = document.getElementById('statusModal');
    const avatar = document.getElementById('statusModalAvatar');
    const name = document.getElementById('statusModalName');
    const time = document.getElementById('statusModalTime');
    const body = document.getElementById('statusModalBody');

    avatar.src = post.avatar_url || post.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}`;
    name.textContent = post.display_name;
    time.textContent = new Date(post.created_at).toLocaleString();

    // Content
    let contentHtml = '';
    if (post.media_url) {
        if (post.media_type === 'video') {
            contentHtml += `<video src="${post.media_url}" controls autoplay class="status-full-media"></video>`;
        } else {
            contentHtml += `<img src="${post.media_url}" class="status-full-media">`;
        }
        if (post.content) {
            contentHtml += `<div style="position: absolute; bottom: 50px; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 20px; color: white; text-align: center;">${post.content}</div>`;
        }
    } else {
        contentHtml = `<div class="status-full-text">${post.content}</div>`;
    }

    body.innerHTML = contentHtml;
    modal.classList.add('active');
};

window.closeStatusModal = function () {
    const modal = document.getElementById('statusModal');
    modal.classList.remove('active');
    // Stop video if playing
    const video = modal.querySelector('video');
    if (video) video.pause();
};



// Setup event listeners for Social page
function setupSocialEventListeners() {
    // No specific listeners needed for now as we use standard post cards
}

// Render Bookmarks page
async function renderBookmarksPage() {
    if (!(await requireAuth())) return;

    const feed = document.getElementById('postsFeed');

    // Show loading state
    feed.innerHTML = '<div class="loading">Loading bookmarks...</div>';

    try {
        // Fetch bookmarked posts
        const response = await fetch(`${API_BASE}/users/${currentUser.id}/bookmarks`);
        if (!response.ok) throw new Error('Failed to fetch bookmarks');

        const bookmarkedPosts = await response.json();

        if (bookmarkedPosts.length === 0) {
            feed.innerHTML = `
                <div style="padding: var(--spacing-xl); text-align: center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin: 0 auto var(--spacing-lg); color: var(--color-text-tertiary);">
                        <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h2 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-md);">Save posts for later</h2>
                    <p style="color: var(--color-text-secondary);">
                        Bookmark posts to easily find them again in the future.
                    </p>
                </div>
            `;
        } else {
            feed.innerHTML = `
                <div class="page-content">
                    ${bookmarkedPosts.map(post => createPostHTML(post)).join('')}
                </div>
            `;
            attachPostEventListeners();
        }
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        feed.innerHTML = `
            <div class="loading" style="color: var(--color-like);">
                Failed to load bookmarks.
            </div>
        `;
    }
}

// Render Profile page
async function renderProfilePage() {
    if (!(await requireAuth())) return;

    const feed = document.getElementById('postsFeed');

    // Show loading state
    feed.innerHTML = '<div class="loading">Loading profile...</div>';

    try {
        // Fetch current user's posts from API
        const postsUrl = `${API_BASE}/posts?user_id=${currentUser.id}&current_user_id=${currentUser.id}`;
        const postsResponse = await fetch(postsUrl);
        const userPosts = await postsResponse.json();

        // Fetch fresh user data for stats
        const userResponse = await fetch(`${API_BASE}/users/by-username/${currentUser.username}`);
        const user = await userResponse.json();

        feed.innerHTML = `
            <div class="page-content">
                <!-- Profile Header -->
                <div style="padding: var(--spacing-xl); border-bottom: 1px solid var(--color-border);">
                    <div style="padding: 0 var(--spacing-lg);">
                        <img src="${currentUser.avatar_url}" alt="${currentUser.display_name}" style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid var(--color-border); margin-bottom: var(--spacing-lg);">
                        <h2 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-xs);">${currentUser.display_name}</h2>
                        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">@${currentUser.username}</p>
                        <p style="margin-bottom: var(--spacing-lg);">
                            ${currentUser.bio || 'No bio yet'}
                        </p>
                        <div style="display: flex; gap: var(--spacing-xl); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                            <div><span style="color: var(--color-text-primary); font-weight: 600;">${user.post_count || 0}</span> Posts</div>
                            <div><span style="color: var(--color-text-primary); font-weight: 600;">${user.following_count || 0}</span> Following</div>
                            <div><span style="color: var(--color-text-primary); font-weight: 600;">${user.followers_count || 0}</span> Followers</div>
                            <div style="cursor: pointer;" onclick="renderSocialPage()">
                                <span style="color: var(--color-text-primary); font-weight: 600;">${user.friends_count || 0}</span> Friends
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- User Posts -->
                <div style="padding-top: var(--spacing-md);">
                    ${userPosts.length > 0 ? userPosts.map(post => createPostHTML(post)).join('') : '<div class="loading">No posts yet. Share your first post!</div>'}
                </div>
            </div>
        `;

        if (userPosts.length > 0) {
            attachPostEventListeners();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        feed.innerHTML = `
            <div class="loading" style="color: var(--color-like);">
                Failed to load profile.
            </div>
        `;
    }
}

// Render User Profile Page (by username)
async function renderUserProfilePage(username) {
    const feed = document.getElementById('postsFeed');

    // Show loading state
    feed.innerHTML = '<div class="loading">Loading profile...</div>';

    try {
        // Fetch user by username
        const userResponse = await fetch(`${API_BASE}/users/by-username/${username}`);
        if (!userResponse.ok) throw new Error('User not found');

        const user = await userResponse.json();

        // Fetch user's posts
        const postsUrl = currentUser
            ? `${API_BASE}/posts?user_id=${user.id}&current_user_id=${currentUser.id}`
            : `${API_BASE}/posts?user_id=${user.id}`;
        const postsResponse = await fetch(postsUrl);
        const userPosts = await postsResponse.json();

        // Check if following
        let isFollowing = false;
        if (currentUser && currentUser.id !== user.id) {
            try {
                const followRes = await fetch(`${API_BASE}/users/${user.id}/is-following?user_id=${currentUser.id}`);
                if (followRes.ok) {
                    const followData = await followRes.json();
                    isFollowing = followData.isFollowing;
                }
            } catch (e) {
                console.error('Error checking follow status:', e);
            }
        }

        feed.innerHTML = `
            <div class="page-content">
                <!-- Profile Header -->
                <div style="padding: var(--spacing-xl); border-bottom: 1px solid var(--color-border);">
                    <div style="padding: 0 var(--spacing-lg);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-lg);">
                            <img src="${user.avatar_url}" alt="${user.display_name}" style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid var(--color-border);">
                            ${currentUser && currentUser.id !== user.id ? `
                                <div style="display: flex; gap: var(--spacing-md);">
                                    <button onclick="startConversation(${user.id})" class="action-btn" style="border: 1px solid var(--color-border); padding: 8px 16px; border-radius: 20px; color: var(--color-text-primary);">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                        </svg>
                                        Message
                                    </button>
                                    <button onclick="toggleFollow(${user.id}, this)" class="btn-post-small" style="padding: 8px 24px; ${isFollowing ? 'background: transparent; color: var(--color-primary); border: 1px solid var(--color-primary);' : ''}">${isFollowing ? 'Following' : 'Follow'}</button>
                                </div>
                            ` : ''}
                        </div>
                        <h2 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-xs);">${user.display_name}</h2>
                        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">@${user.username}</p>
                        <p style="margin-bottom: var(--spacing-lg);">
                            ${user.bio || 'No bio yet'}
                        </p>
                        <div style="display: flex; gap: var(--spacing-xl); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                            <div><span style="color: var(--color-text-primary); font-weight: 600;">${user.post_count || 0}</span> Posts</div>
                            <div><span style="color: var(--color-text-primary); font-weight: 600;">${user.following_count || 0}</span> Following</div>
                            <div><span style="color: var(--color-text-primary); font-weight: 600;">${user.followers_count || 0}</span> Followers</div>
                            <div style="cursor: pointer;" onclick="renderSocialPage()">
                                <span style="color: var(--color-text-primary); font-weight: 600;">${user.friends_count || 0}</span> Friends
                            </div>
                        </div>
                    </div>
                </div>

                <!-- User Posts -->
                <div style="padding-top: var(--spacing-md);">
                    ${userPosts.length > 0 ? userPosts.map(post => createPostHTML(post)).join('') : '<div class="loading">No posts yet.</div>'}
                </div>
            </div>
        `;

        if (userPosts.length > 0) {
            attachPostEventListeners();
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        feed.innerHTML = `
            <div class="loading" style="color: var(--color-like);">
                User not found or error loading profile.
            </div>
        `;
    }
}

// Start conversation
async function startConversation(otherUserId) {
    if (!(await requireAuth())) return;

    try {
        const response = await fetch(`${API_BASE}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user1_id: currentUser.id,
                user2_id: otherUserId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.error && data.error.includes('must follow each other')) {
                showAlertModal('You can only message people who follow you back.');
                return;
            }
            throw new Error(data.error || 'Failed to start conversation');
        }

        // Navigate to messages page and open conversation
        navigateToPage('messages');
        // Wait for messages page to load then open conversation
        // In a real app we'd use a router or state management
        setTimeout(() => {
            renderConversation(data.id, data.other_username, data.other_display_name, data.other_avatar_url);
        }, 500);

    } catch (error) {
        console.error('Error starting conversation:', error);
        showAlertModal(error.message || 'Failed to start conversation', 'Error');
    }
}

// Render Hashtag Page
async function renderHashtagPage(tag) {
    const feed = document.getElementById('postsFeed');

    // Show loading state
    feed.innerHTML = '<div class="loading">Loading posts...</div>';

    try {
        // Fetch posts with this hashtag
        const response = await fetch(`${API_BASE}/posts/by-hashtag/${encodeURIComponent(tag)}`);
        if (!response.ok) throw new Error('Failed to fetch posts');

        const hashtagPosts = await response.json();

        feed.innerHTML = `
            <div class="page-content">
                <div style="padding: var(--spacing-xl); border-bottom: 1px solid var(--color-border);">
                    <h2 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-sm); color: var(--color-primary);">#${tag}</h2>
                    <p style="color: var(--color-text-secondary);">${hashtagPosts.length} post${hashtagPosts.length !== 1 ? 's' : ''}</p>
                </div>
                <div>
                    ${hashtagPosts.length > 0 ? hashtagPosts.map(post => createPostHTML(post)).join('') : '<div class="loading">No posts with this hashtag yet.</div>'}
                </div>
            </div>
        `;

        if (hashtagPosts.length > 0) {
            attachPostEventListeners();
        }
    } catch (error) {
        console.error('Error loading hashtag posts:', error);
        feed.innerHTML = `
            <div class="loading" style="color: var(--color-like);">
                Failed to load posts for this hashtag.
            </div>
        `;
    }
}

// Helper function to attach event listeners to posts
function attachPostEventListeners() {
    document.querySelectorAll('.action-btn[data-action="like"]').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.dataset.postId;
            toggleLike(postId, this);
        });
    });

    document.querySelectorAll('.action-btn[data-action="repost"]').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.dataset.postId;
            toggleRepost(postId, this);
        });
    });

    document.querySelectorAll('.action-btn[data-action="reply"]').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.dataset.postId;
            openReplyModal(postId);
        });
    });

    document.querySelectorAll('.action-btn[data-action="bookmark"]').forEach(btn => {
        btn.addEventListener('click', function () {
            const postId = this.dataset.postId;
            toggleBookmark(postId, this);
        });
    });

    // Post menu buttons
    document.querySelectorAll('.action-btn[data-action="menu"]').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const postId = this.dataset.postId;
            const authorId = this.dataset.authorId;
            const authorUsername = this.dataset.authorUsername;
            const content = this.dataset.content;
            togglePostMenu(e, postId, authorId, authorUsername, content);
        });
    });
}

// ===== REPLY MODAL =====
let currentReplyPostId = null;

async function openReplyModal(postId) {
    if (!(await requireAuth())) return;

    currentReplyPostId = postId;
    const post = posts.find(p => p.id == postId);

    if (!post) return;

    const replyModal = document.getElementById('replyModal');
    const replyToPost = document.getElementById('replyToPost');
    const replyInput = document.getElementById('replyInput');
    const replyCharCounter = document.getElementById('replyCharCounter');

    // Show the original post
    replyToPost.innerHTML = `
        <div class="post-header">
            <span class="post-author">${post.display_name}</span>
            <span class="post-username">@${post.username}</span>
        </div>
        <div class="post-text">${linkifyContent(post.content)}</div>
    `;

    // Clear input
    replyInput.value = '';
    updateCharCounter(replyInput, replyCharCounter);

    // Show modal
    replyModal.classList.add('active');
    replyInput.focus();
}

function closeReplyModal() {
    const replyModal = document.getElementById('replyModal');
    replyModal.classList.remove('active');
    currentReplyPostId = null;
}

async function submitReply() {
    const replyInput = document.getElementById('replyInput');
    const content = replyInput.value.trim();

    if (!content) {
        showAlertModal('Please enter a reply');
        return;
    }

    if (content.length > 280) {
        showAlertModal('Reply is too long (max 280 characters)');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/posts/${currentReplyPostId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                content: content
            })
        });

        if (!response.ok) throw new Error('Failed to post reply');

        // Close modal and reload posts
        closeReplyModal();
        await loadPosts();

    } catch (error) {
        console.error('Error posting reply:', error);
        showAlertModal('Failed to post reply. Please try again.', 'Error');
    }
}

// Setup reply modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    const closeReplyModalBtn = document.getElementById('closeReplyModalBtn');
    const replyModalOverlay = document.getElementById('replyModalOverlay');
    const replyPostBtn = document.getElementById('replyPostBtn');
    const replyInput = document.getElementById('replyInput');
    const replyCharCounter = document.getElementById('replyCharCounter');

    if (closeReplyModalBtn) {
        closeReplyModalBtn.addEventListener('click', closeReplyModal);
    }

    if (replyModalOverlay) {
        replyModalOverlay.addEventListener('click', closeReplyModal);
    }

    if (replyPostBtn) {
        replyPostBtn.addEventListener('click', submitReply);
    }

    if (replyInput) {
        replyInput.addEventListener('input', () => {
            updateCharCounter(replyInput, replyCharCounter);
        });
    }
});

// ===== AUTOCOMPLETE SYSTEM =====
class Autocomplete {
    constructor(textarea, dropdown) {
        this.textarea = textarea;
        this.dropdown = dropdown;
        this.suggestions = [];
        this.selectedIndex = -1;
        this.currentQuery = '';
        this.currentType = null; // 'hashtag' or 'mention'
        this.debounceTimer = null;

        this.init();
    }

    init() {
        this.textarea.addEventListener('input', () => this.handleInput());
        this.textarea.addEventListener('keydown', (e) => this.handleKeydown(e));
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target) && e.target !== this.textarea) {
                this.hide();
            }
        });
    }

    handleInput() {
        clearTimeout(this.debounceTimer);

        const cursorPos = this.textarea.selectionStart;
        const text = this.textarea.value.substring(0, cursorPos);

        // Check for hashtag
        const hashtagMatch = text.match(/#([\p{L}\p{N}_-]+)$/u); // Updated regex for broader character support
        if (hashtagMatch) {
            this.currentType = 'hashtag';
            this.currentQuery = hashtagMatch[1];
            this.debounceTimer = setTimeout(() => this.fetchSuggestions(), 300);
            return;
        }

        // Check for mention
        const mentionMatch = text.match(/@(\w*)$/);
        if (mentionMatch) {
            this.currentType = 'mention';
            this.currentQuery = mentionMatch[1];
            this.debounceTimer = setTimeout(() => this.fetchSuggestions(), 300);
            return;
        }

        this.hide();
    }

    async fetchSuggestions() {
        if (!this.currentQuery && this.currentQuery !== '') {
            this.hide();
            return;
        }

        try {
            let url;
            if (this.currentType === 'hashtag') {
                url = `${API_BASE}/autocomplete/hashtags?query=${encodeURIComponent(this.currentQuery)}`;
            } else if (this.currentType === 'mention') {
                url = `${API_BASE}/autocomplete/users?query=${encodeURIComponent(this.currentQuery)}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            this.suggestions = data;
            this.selectedIndex = -1;
            this.render();
        } catch (error) {
            console.error('Error fetching autocomplete suggestions:', error);
            this.hide();
        }
    }

    render() {
        if (this.suggestions.length === 0) {
            this.hide();
            return;
        }

        this.dropdown.innerHTML = '';

        this.suggestions.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            if (index === this.selectedIndex) {
                div.classList.add('selected');
            }

            if (this.currentType === 'hashtag') {
                div.innerHTML = `
                    <div class="info">
                        <div class="hashtag">#${item.tag}</div>
                    </div>
                    <div class="count">${item.count} posts</div>
                `;
            } else if (this.currentType === 'mention') {
                div.innerHTML = `
                    <img src="${item.avatar_url}" alt="${item.username}" class="avatar">
                    <div class="info">
                        <div class="name">${item.display_name}</div>
                        <div class="username">@${item.username}</div>
                    </div>
                `;
            }

            div.addEventListener('click', () => this.select(item));
            this.dropdown.appendChild(div);
        });

        this.show();
    }

    show() {
        // Position dropdown below textarea
        const rect = this.textarea.getBoundingClientRect();
        const parentRect = this.dropdown.parentElement.getBoundingClientRect();

        this.dropdown.style.top = `${this.textarea.offsetTop + this.textarea.offsetHeight}px`;
        this.dropdown.style.left = `${this.textarea.offsetLeft}px`;
        this.dropdown.style.width = `${this.textarea.offsetWidth}px`;
        this.dropdown.classList.add('active');
    }

    hide() {
        this.dropdown.classList.remove('active');
        this.suggestions = [];
        this.selectedIndex = -1;
    }

    handleKeydown(e) {
        if (!this.dropdown.classList.contains('active')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
            this.render();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.render();
        } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
            e.preventDefault();
            this.select(this.suggestions[this.selectedIndex]);
        } else if (e.key === 'Escape') {
            this.hide();
        }
    }

    select(item) {
        const cursorPos = this.textarea.selectionStart;
        const text = this.textarea.value;

        let replacement;
        if (this.currentType === 'hashtag') {
            replacement = `#${item.tag}`;
            const beforeCursor = text.substring(0, cursorPos);
            const afterCursor = text.substring(cursorPos);
            const newBeforeCursor = beforeCursor.replace(/#\w*$/, replacement + ' ');
            this.textarea.value = newBeforeCursor + afterCursor;
            this.textarea.selectionStart = this.textarea.selectionEnd = newBeforeCursor.length;
        } else if (this.currentType === 'mention') {
            replacement = `@${item.username}`;
            const beforeCursor = text.substring(0, cursorPos);
            const afterCursor = text.substring(cursorPos);
            const newBeforeCursor = beforeCursor.replace(/@\w*$/, replacement + ' ');
            this.textarea.value = newBeforeCursor + afterCursor;
            this.textarea.selectionStart = this.textarea.selectionEnd = newBeforeCursor.length;
        }

        // Trigger input event to update character counter
        this.textarea.dispatchEvent(new Event('input'));

        this.hide();
        this.textarea.focus();
    }
}

// Initialize autocomplete for all compose boxes
document.addEventListener('DOMContentLoaded', () => {
    const quickCompose = document.getElementById('quickComposeInput');
    const quickDropdown = document.getElementById('quickAutocomplete');
    if (quickCompose && quickDropdown) {
        new Autocomplete(quickCompose, quickDropdown);
    }

    const modalCompose = document.getElementById('modalComposeInput');
    const modalDropdown = document.getElementById('modalAutocomplete');
    if (modalCompose && modalDropdown) {
        new Autocomplete(modalCompose, modalDropdown);
    }

    const replyInput = document.getElementById('replyInput');
    const replyDropdown = document.getElementById('replyAutocomplete');
    if (replyInput && replyDropdown) {
        new Autocomplete(replyInput, replyDropdown);
    }
});

// ===== SETTINGS MODAL =====
document.addEventListener('DOMContentLoaded', () => {
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsModalOverlay = document.getElementById('settingsModalOverlay');

    // Open settings modal
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showAlertModal('Please log in to access settings');
                return;
            }
            openSettingsModal();
        });
    }

    // Close settings modal
    const closeSettings = () => {
        settingsModal.classList.remove('active');
        navigateToPage('home');
    };

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }

    if (settingsModalOverlay) {
        settingsModalOverlay.addEventListener('click', closeSettings);
    }

    // Tab switching
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // Update tab buttons
            settingsTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Update tab content
            document.querySelectorAll('.settings-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${targetTab}Tab`).classList.add('active');
        });
    });

    // Bio character counter
    const settingsBio = document.getElementById('settingsBio');
    const bioCharCounter = document.getElementById('bioCharCounter');
    if (settingsBio && bioCharCounter) {
        settingsBio.addEventListener('input', () => {
            const length = settingsBio.value.length;
            bioCharCounter.textContent = `${length} / 160`;
            if (length > 144) {
                bioCharCounter.style.color = 'var(--color-like)';
            } else {
                bioCharCounter.style.color = 'var(--color-text-secondary)';
            }
        });
    }

    // Save profile button
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    // Feed tabs
    const feedTabs = document.querySelectorAll('.feed-tab');
    feedTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            feedTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update current feed
            currentFeed = tab.dataset.feed;

            // Reset pagination and reload posts
            resetPagination();
            loadPosts();
        });
    });

    // Save account button
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', saveAccount);
    }

    // Delete account button
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmed = await showConfirmModal(
                'Delete Account',
                'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your posts, likes, and data will be removed.',
                'Delete Account'
            );
            if (confirmed) {
                await deleteAccount();
            }
        });
    }

    // Download data button
    const downloadDataBtn = document.getElementById('downloadDataBtn');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', downloadData);
    }
});

function openSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');

    // Populate form with current user data
    if (currentUser) {
        document.getElementById('settingsEmail').value = currentUser.email || '';
        document.getElementById('settingsUsername').value = currentUser.username || '';
    }

    // Clear password fields
    document.getElementById('settingsCurrentPassword').value = '';
    document.getElementById('settingsNewPassword').value = '';
    document.getElementById('settingsConfirmPassword').value = '';

    settingsModal.classList.add('active');
}

// Logout function
function handleLogout() {
    logout();
}

function logout() {
    localStorage.removeItem('user');
    currentUser = null;
    window.location.href = '/login';
}

async function deleteAccount() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete account');

        showAlertModal('Your account has been deleted.', 'Success');
        logout();
    } catch (error) {
        console.error('Error deleting account:', error);
        showAlertModal('Failed to delete account. Please try again.', 'Error');
    }
}

async function downloadData() {
    if (!currentUser) return;

    const btn = document.getElementById('downloadDataBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Requesting...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}/export-data`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to request data export');

        showAlertModal('Data export requested! You will receive an email with the download link shortly.', 'Success');
    } catch (error) {
        console.error('Error requesting data export:', error);
        showAlertModal('Failed to request data export. Please try again.', 'Error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function saveAccount() {
    if (!currentUser) return;

    const email = document.getElementById('settingsEmail').value.trim();
    const username = document.getElementById('settingsUsername').value.trim();
    const currentPassword = document.getElementById('settingsCurrentPassword').value;
    const newPassword = document.getElementById('settingsNewPassword').value;
    const confirmPassword = document.getElementById('settingsConfirmPassword').value;

    if (!email || !username) {
        showAlertModal('Email and username are required');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlertModal('Please enter a valid email address');
        return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        showAlertModal('Username can only contain letters, numbers, and underscores');
        return;
    }

    // Check if password change is requested
    if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword) {
            showAlertModal('Please enter your current password');
            return;
        }
        if (!newPassword) {
            showAlertModal('Please enter a new password');
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlertModal('New passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            showAlertModal('New password must be at least 6 characters');
            return;
        }
    }

    try {
        const updateData = {
            email: email,
            username: username
        };

        if (currentPassword && newPassword) {
            updateData.current_password = currentPassword;
            updateData.new_password = newPassword;
        }

        const response = await fetch(`${API_BASE}/users/${currentUser.id}/account`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update account');
        }

        const updatedUser = await response.json();

        // Update current user
        currentUser.email = updatedUser.email;
        currentUser.username = updatedUser.username;
        localStorage.setItem('user', JSON.stringify(currentUser));

        // Update UI
        updateUserInfo();

        // Clear password fields
        document.getElementById('settingsCurrentPassword').value = '';
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsConfirmPassword').value = '';

        showAlertModal('Account settings updated successfully!', 'Success');
    } catch (error) {
        console.error('Error updating account:', error);
        showAlertModal(error.message || 'Failed to update account settings. Please try again.', 'Error');
    }
}


// ===== MEDIA UPLOAD =====


document.addEventListener('DOMContentLoaded', () => {
    setupMediaUpload('quick');
    setupMediaUpload('modal');
    setupMediaUpload('reply');
});

async function setupMediaUpload(type) {
    const input = document.getElementById(`${type}MediaInput`);
    const preview = document.getElementById(`${type}MediaPreview`);
    const previewImg = document.getElementById(`${type}MediaPreviewImg`);
    const previewVid = document.getElementById(`${type}MediaPreviewVid`);
    const removeBtn = document.getElementById(`${type}RemoveMedia`);

    console.log(`Setting up media upload for ${type}:`, { input, preview, previewImg, previewVid, removeBtn });

    if (!input) {
        console.warn(`No input found for ${type}`);
        return;
    }

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        console.log(`File selected for ${type}:`, file);
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;

        if (file.size > maxSize) {
            showAlertModal(`File too large. Max size: ${isImage ? '5MB' : '50MB'}`);
            input.value = '';
            return;
        }

        console.log(`Showing preview for ${type}, isImage:`, isImage, 'isVideo:', isVideo);

        if (isImage) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.style.display = 'block';
            previewVid.style.display = 'none';
            console.log('Image preview set');
        } else if (isVideo) {
            previewVid.src = URL.createObjectURL(file);
            previewVid.style.display = 'block';
            previewImg.style.display = 'none';
            console.log('Video preview set');
        }

        preview.style.display = 'block';
        console.log('Preview container displayed');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/upload/post-media', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            currentMedia[type] = {
                url: data.url,
                type: data.type
            };
            console.log(`Media uploaded for ${type}:`, currentMedia[type]);
        } catch (error) {
            console.error('Upload error:', error);
            showAlertModal('Failed to upload media', 'Error');
            removeMedia(type);
        }
    });

    if (removeBtn) {
        removeBtn.addEventListener('click', () => removeMedia(type));
    }
}

function removeMedia(type) {
    const input = document.getElementById(`${type}MediaInput`);
    const preview = document.getElementById(`${type}MediaPreview`);
    const previewImg = document.getElementById(`${type}MediaPreviewImg`);
    const previewVid = document.getElementById(`${type}MediaPreviewVid`);

    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (previewImg) {
        previewImg.style.display = 'none';
        previewImg.src = '';
    }
    if (previewVid) {
        previewVid.style.display = 'none';
        previewVid.src = '';
    }
    currentMedia[type] = null;
}

// ===== MOBILE MODAL =====
function openComposeModal() {
    document.getElementById('composeModal').classList.add('active');
    setTimeout(() => {
        document.getElementById('modalComposeInput').focus();
    }, 100);
}

function closeComposeModal() {
    document.getElementById('composeModal').classList.remove('show');
}

async function submitModalPost() {
    if (!(await requireAuth())) return;

    const input = document.getElementById('modalComposeInput');
    const content = input.value.trim();

    if (!content) return;

    try {
        const response = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                content: content,
                media_url: null,
                media_type: null
            })
        });

        if (!response.ok) throw new Error('Failed to create post');

        input.value = '';
        closeComposeModal();

        // Refresh feed
        resetPagination();
        await loadPosts();

    } catch (error) {
        console.error('Error creating post:', error);
        showAlertModal('Failed to create post', 'Error');
    }
}

// Share post function
async function sharePost(postId, button) {
    const postUrl = `${window.location.origin}/post/${postId}`;

    try {
        await navigator.clipboard.writeText(postUrl);
        // Show temporary success message
        const originalHTML = button.innerHTML;
        button.innerHTML = '<span style="font-size: 0.75rem;">✓ Copied!</span>';
        button.style.color = 'var(--color-primary)';
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.color = '';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        showAlertModal('Failed to copy link', 'Error');
    }
}

// Delete post function
async function deletePost(postId) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });

        if (!response.ok) throw new Error('Failed to delete post');

        // Refresh the current page
        resetPagination();
        await loadPosts();

        showAlertModal('Post deleted successfully', 'Success');
    } catch (error) {
        console.error('Failed to delete post:', error);
        showAlertModal('Failed to delete post. Please try again.', 'Error');
    }
}

// Make functions globally available
window.toggleLike = toggleLike;
window.toggleRepost = toggleRepost;
window.toggleFollow = toggleFollow;
window.deletePost = deletePost;
window.openReplyModal = openReplyModal;
window.closeReplyModal = closeReplyModal;
window.submitReply = submitReply;
window.navigateToPage = navigateToPage;
window.handleLogout = handleLogout;
window.startConversation = startConversation;
window.openComposeModal = openComposeModal;
window.closeComposeModal = closeComposeModal;
window.submitModalPost = submitModalPost;
window.sharePost = sharePost;

// ===== MESSAGING FEATURE =====

// Encryption utilities (simple AES-like encryption for demo)
const MessageEncryption = {
    encrypt(text, key) {
        // Simple XOR encryption for demo (in production, use Web Crypto API)
        let encrypted = '';
        for (let i = 0; i < text.length; i++) {
            encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(encrypted); // Base64 encode
    },

    decrypt(encryptedText, key) {
        try {
            const encrypted = atob(encryptedText); // Base64 decode
            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return decrypted;
        } catch (e) {
            console.error('Decryption error:', e);
            return '[Decryption failed]';
        }
    }
};

// Global messaging state
var currentConversationId = null;  // Use var to avoid temporal dead zone
var currentEncryptionKey = null;   // Use var to avoid temporal dead zone
var conversations = [];             // Use var to avoid temporal dead zone
var typingTimeout = null;           // Use var to avoid temporal dead zone

// Render messages page
async function renderMessagesPage() {
    if (!(await requireAuth())) return;

    // Get the feed container
    const feed = document.getElementById('postsFeed');
    const messagesPageElement = document.getElementById('messagesPage');

    // Hide standalone messages page if it exists
    if (messagesPageElement) {
        messagesPageElement.style.display = 'none';
    }

    // Render messages UI inside the feed
    feed.innerHTML = `
        <div class="messages-page" style="display: flex;">
            <div class="conversations-sidebar">
                <div class="conversations-header">
                    <h2>Messages</h2>
                    <div class="encryption-notice">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span>Encrypted</span>
                    </div>
                </div>
                <div id="conversationsList" class="conversations-list"></div>
            </div>
            
            <div class="message-thread">
                <div id="noConversationSelected" class="no-conversation">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    <h3>Select a conversation</h3>
                    <p>Choose a conversation from the list or start a new one</p>
                </div>

                <div id="conversationThread" style="display: none;">
                    <div class="thread-header">
                        <div class="thread-user-info">
                            <img class="thread-avatar" src="" alt="">
                            <div>
                                <div class="thread-display-name"></div>
                                <div class="thread-username"></div>
                                <div id="typingIndicator" class="typing-indicator" style="display: none;">
                                    <span>typing</span>
                                    <div class="typing-dots">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="messagesContainer" class="messages-container"></div>
                    
                    <div class="message-input-container">
                        <textarea 
                            id="messageInput" 
                            placeholder="Type a message..." 
                            maxlength="800"
                            rows="1"></textarea>
                        <div class="message-input-footer">
                            <span id="charCounter" class="char-counter">0 / 800</span>
                            <button id="sendMessageBtn" class="btn-send-message" disabled>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Show the feed
    feed.style.display = 'block';

    // Load conversations
    await loadConversations();

    // Re-attach event listeners for message input
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            updateCharCounter();
            sendTypingIndicator();

            // Auto-resize textarea
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
}

// Load all conversations
async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE}/conversations?user_id=${currentUser.id}`);
        conversations = await response.json();

        const conversationsList = document.getElementById('conversationsList');

        if (conversations.length === 0) {
            conversationsList.innerHTML = `
                <div style="padding: var(--spacing-xl); text-align: center; color: var(--color-text-secondary);">
                    <p>No conversations yet</p>
                    <p style="font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">
                        Click "Message" on a user's profile to start chatting
                    </p>
                </div>
            `;
            return;
        }

        conversationsList.innerHTML = conversations.map(conv => {
            const otherUser = conv.user1_id === currentUser.id ? {
                id: conv.user2_id,
                username: conv.user2_username,
                display_name: conv.user2_display_name,
                avatar_url: conv.user2_avatar
            } : {
                id: conv.user1_id,
                username: conv.user1_username,
                display_name: conv.user1_display_name,
                avatar_url: conv.user1_avatar
            };

            const lastMessage = conv.last_message ? MessageEncryption.decrypt(conv.last_message, conv.encryption_key) : 'No messages yet';
            const timeAgo = conv.last_message_time ? formatTimeAgo(new Date(conv.last_message_time)) : '';
            const unreadCount = parseInt(conv.unread_count) || 0;

            return `
                <div class="conversation-item ${currentConversationId === conv.id ? 'active' : ''}" 
                     onclick="openConversation(${conv.id}, ${otherUser.id}, '${otherUser.username}', '${otherUser.display_name}', '${otherUser.avatar_url}')">
                    <img src="${otherUser.avatar_url}" alt="${otherUser.display_name}">
                    <div class="conversation-info">
                        <div class="conversation-name">
                            <span>${otherUser.display_name}</span>
                            ${timeAgo ? `<span class="conversation-time">${timeAgo}</span>` : ''}
                        </div>
                        <div class="conversation-preview">
                            ${lastMessage}
                            ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// Open a conversation
async function openConversation(conversationId, otherUserId, username, displayName, avatarUrl) {
    currentConversationId = conversationId;

    // Update UI
    document.getElementById('noConversationSelected').style.display = 'none';
    document.getElementById('conversationThread').style.display = 'flex';

    // Update header
    document.querySelector('.thread-avatar').src = avatarUrl;
    document.querySelector('.thread-display-name').textContent = displayName;
    document.querySelector('.thread-username').textContent = `@${username}`;

    // Load messages
    await loadMessages(conversationId);

    // Reload conversations to update active state
    await loadConversations();
}

// Load messages in a conversation
async function loadMessages(conversationId) {
    try {
        const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages?user_id=${currentUser.id}`);
        const data = await response.json();

        currentEncryptionKey = data.encryption_key;
        const messages = data.messages;

        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mark unread messages as read
        messages.forEach(msg => {
            if (msg.sender_id !== currentUser.id && !msg.read_at) {
                markMessageAsRead(conversationId, msg.id);
            }
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Create message HTML
function createMessageHTML(message) {
    const isSent = message.sender_id === currentUser.id;
    const decryptedContent = MessageEncryption.decrypt(message.encrypted_content, currentEncryptionKey);
    const timeAgo = formatTimeAgo(new Date(message.created_at));

    return `
        <div class="message-bubble ${isSent ? 'sent' : 'received'}">
            <div class="message-content">${escapeHtml(decryptedContent)}</div>
            <div class="message-meta">
                <span>${timeAgo}</span>
                ${isSent && message.read_at ? `
                    <span class="read-receipt" title="Read">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                            <polyline points="20 6 9 17 4 12" transform="translate(4, 0)"/>
                        </svg>
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content || !currentConversationId || !currentEncryptionKey) return;

    if (content.length > 800) {
        showAlertModal('Message is too long (max 800 characters)');
        return;
    }

    try {
        const encryptedContent = MessageEncryption.encrypt(content, currentEncryptionKey);

        const response = await fetch(`${API_BASE}/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_id: currentUser.id,
                encrypted_content: encryptedContent
            })
        });

        if (response.ok) {
            input.value = '';
            updateCharCounter();
            await loadMessages(currentConversationId);
            await loadConversations();
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showAlertModal('Failed to send message', 'Error');
    }
}

// Mark message as read
async function markMessageAsRead(conversationId, messageId) {
    try {
        await fetch(`${API_BASE}/conversations/${conversationId}/messages/${messageId}/read`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Start conversation (called from user profile)
async function startConversation(otherUserId) {
    if (!currentUser) {
        showAlertModal('Please log in to send messages');
        return;
    }

    try {
        // Create or get existing conversation
        const response = await fetch(`${API_BASE}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user1_id: currentUser.id,
                user2_id: otherUserId
            })
        });

        const conversation = await response.json();

        // Navigate to messages page
        navigateToPage('messages');

        // Wait a bit for page to render, then load and open conversation
        setTimeout(async () => {
            await loadConversations();
            // Get the conversation from the loaded list
            const conv = conversations.find(c => c.id === conversation.id);
            if (conv) {
                const otherUser = conv.user1_id === currentUser.id ? {
                    id: conv.user2_id,
                    username: conv.user2_username,
                    display_name: conv.user2_display_name,
                    avatar_url: conv.user2_avatar
                } : {
                    id: conv.user1_id,
                    username: conv.user1_username,
                    display_name: conv.user1_display_name,
                    avatar_url: conv.user1_avatar
                };
                await openConversation(conversation.id, otherUser.id, otherUser.username, otherUser.display_name, otherUser.avatar_url);
            }
        }, 200);
    } catch (error) {
        console.error('Error starting conversation:', error);
        showAlertModal('Failed to start conversation', 'Error');
    }
}

// Update character counter
function updateCharCounter() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCounter');
    const sendBtn = document.getElementById('sendMessageBtn');

    if (!input || !counter || !sendBtn) return;

    const length = input.value.length;
    counter.textContent = `${length} / 800`;

    // Update counter color
    counter.classList.remove('warning', 'error');
    if (length > 750) {
        counter.classList.add('error');
    } else if (length > 650) {
        counter.classList.add('warning');
    }

    // Enable/disable send button
    sendBtn.disabled = length === 0 || length > 800;
}

// Send typing indicator
function sendTypingIndicator() {
    if (!currentConversationId) return;

    clearTimeout(typingTimeout);

    fetch(`${API_BASE}/conversations/${currentConversationId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: currentUser.id,
            is_typing: true
        })
    }).catch(e => console.error('Error sending typing indicator:', e));

    typingTimeout = setTimeout(() => {
        fetch(`${API_BASE}/conversations/${currentConversationId}/typing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                is_typing: false
            })
        }).catch(e => console.error('Error sending typing indicator:', e));
    }, 3000);
}

// Setup message input listeners
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            updateCharCounter();
            sendTypingIndicator();

            // Auto-resize textarea
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
});

// Export functions
window.renderSocialPage = renderSocialPage;
window.deleteSocialPost = deleteSocialPost;



