// Updates Feature JavaScript
// This file handles the Updates/Channels feature

let currentChannels = [];

// Initialize Updates feature
function initUpdatesFeature() {
    // Navigation
    const updatesNavItem = document.getElementById('updatesNavItem');
    if (updatesNavItem) {
        updatesNavItem.addEventListener('click', (e) => {
            e.preventDefault();
            showUpdatesPage();
        });
    }

    // Create Channel button
    const createChannelBtn = document.getElementById('createChannelBtn');
    if (createChannelBtn) {
        createChannelBtn.addEventListener('click', openCreateChannelModal);
    }

    // Back to channels button
    const backToChannelsBtn = document.getElementById('backToChannelsBtn');
    if (backToChannelsBtn) {
        backToChannelsBtn.addEventListener('click', closeChannelDetail);
    }

    // Create Channel modal
    const closeCreateChannelBtn = document.getElementById('closeCreateChannelBtn');
    const createChannelModalOverlay = document.getElementById('createChannelModalOverlay');
    const submitChannelBtn = document.getElementById('submitChannelBtn');
    const channelNextBtn = document.getElementById('channelNextBtn');
    const channelBackBtn = document.getElementById('channelBackBtn');

    if (closeCreateChannelBtn) {
        closeCreateChannelBtn.addEventListener('click', closeCreateChannelModal);
    }
    if (createChannelModalOverlay) {
        createChannelModalOverlay.addEventListener('click', closeCreateChannelModal);
    }
    if (submitChannelBtn) {
        submitChannelBtn.addEventListener('click', createChannel);
    }
    if (channelNextBtn) {
        channelNextBtn.addEventListener('click', goToChannelStep2);
    }
    if (channelBackBtn) {
        channelBackBtn.addEventListener('click', goToChannelStep1);
    }

    // Enter key on channel name goes to next step
    const channelNameInput = document.getElementById('channelName');
    if (channelNameInput) {
        channelNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                goToChannelStep2();
            }
        });
    }
}

// Show Updates page
function showUpdatesPage() {
    console.log('Showing Updates page');

    // Hide all other pages
    const socialPage = document.getElementById('socialPage');
    const homeFeedContainer = document.getElementById('homeFeedContainer');
    const updatesPage = document.getElementById('updatesPage');

    if (socialPage) socialPage.style.display = 'none';
    if (homeFeedContainer) homeFeedContainer.style.display = 'none';
    if (updatesPage) updatesPage.style.display = 'block';

    // Always show channel discovery when navigating to Updates
    const channelDiscovery = document.getElementById('channelDiscovery');
    const channelDetail = document.getElementById('channelDetail');
    if (channelDiscovery) channelDiscovery.style.display = 'block';
    if (channelDetail) channelDetail.style.display = 'none';

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('span')?.textContent === 'Updates') {
            item.classList.add('active');
        }
    });

    // Load channels
    loadChannels();
}

// Load all channels
async function loadChannels() {
    const channelsList = document.getElementById('channelsList');
    channelsList.innerHTML = '<div class="loading">Loading channels...</div>';

    try {
        // Get current user ID for follow status
        let userId = null;
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                userId = user.id;
            } catch (e) {
                console.error('Error parsing user:', e);
            }
        }

        // Build URL with user_id if available
        let url = '/api/channels';
        if (userId) {
            url += `?user_id=${userId}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load channels');

        const channels = await response.json();
        currentChannels = channels;

        if (channels.length === 0) {
            channelsList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">No channels yet. Be the first to create one!</p>';
            return;
        }

        channelsList.innerHTML = channels.map(channel => createChannelCard(channel)).join('');

        // Add event listeners to follow buttons
        document.querySelectorAll('.channel-follow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFollowChannel(btn.dataset.channelId, btn);
            });
        });

        // Add event listeners to channel cards
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelId = card.dataset.channelId;
                openChannelDetail(channelId);
            });
        });

    } catch (error) {
        console.error('Error loading channels:', error);
        channelsList.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 40px;">Failed to load channels</p>';
    }
}

// Open channel detail view
async function openChannelDetail(channelId) {
    console.log('Opening channel detail:', channelId);

    // Hide discovery, show detail
    document.getElementById('channelDiscovery').style.display = 'none';
    document.getElementById('channelDetail').style.display = 'block';

    // Load channel details
    try {
        // Get current user ID
        let userId = null;
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                userId = user.id;
            } catch (e) {
                console.error('Error parsing user:', e);
            }
        }

        // Build URL with user_id if available
        let url = `/api/channels/${channelId}`;
        if (userId) {
            url += `?user_id=${userId}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load channel');

        const channel = await response.json();
        console.log('Channel loaded:', channel);

        // Update channel info
        document.getElementById('channelDetailName').textContent = channel.name;
        document.getElementById('channelDetailNameFull').textContent = channel.name;
        document.getElementById('channelDetailAvatar').textContent = channel.name.charAt(0).toUpperCase();
        document.getElementById('channelDetailCreator').textContent = `@${channel.creator_username} · ${channel.follower_count} followers`;
        document.getElementById('channelDetailDescription').textContent = channel.description || 'No description';

        // Update follow button
        const followBtn = document.getElementById('channelDetailFollowBtn');
        followBtn.textContent = channel.is_following ? 'Following' : 'Follow';
        followBtn.className = channel.is_following ? 'btn-post-small btn-following' : 'btn-post-small btn-follow';
        followBtn.style.background = channel.is_following ? 'transparent' : 'var(--color-primary)';
        followBtn.style.color = channel.is_following ? 'var(--color-primary)' : '#000';
        followBtn.style.border = '1px solid var(--color-primary)';
        followBtn.onclick = () => toggleFollowChannel(channelId, followBtn);

        // Show compose box if user is the creator
        const composeBox = document.getElementById('channelComposeBox');
        if (userId && channel.creator_id === userId) {
            composeBox.style.display = 'block';

            // Setup compose box
            const updateInput = document.getElementById('channelUpdateInput');
            const charCount = document.getElementById('channelUpdateCharCount');
            const postBtn = document.getElementById('postChannelUpdateBtn');

            // Character counter
            updateInput.oninput = () => {
                const length = updateInput.value.length;
                charCount.textContent = `${length} / 500`;
                charCount.style.color = length > 450 ? '#ef4444' : 'var(--color-text-secondary)';
            };

            // Post button
            postBtn.onclick = () => postChannelUpdate(channelId);
        } else {
            composeBox.style.display = 'none';
        }

        // Load channel updates
        loadChannelUpdates(channelId);

    } catch (error) {
        console.error('Error loading channel detail:', error);
        alert('Failed to load channel details');
        closeChannelDetail();
    }
}

// Post update to channel
async function postChannelUpdate(channelId) {
    const updateInput = document.getElementById('channelUpdateInput');
    const content = updateInput.value.trim();

    if (!content) {
        alert('Please enter some content');
        return;
    }

    // Get current user ID
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        alert('You must be logged in to post updates');
        return;
    }

    let userId;
    try {
        const user = JSON.parse(userStr);
        userId = user.id;
    } catch (e) {
        alert('Error reading user data. Please log in again.');
        return;
    }

    const postBtn = document.getElementById('postChannelUpdateBtn');
    postBtn.disabled = true;
    postBtn.textContent = 'Posting...';

    try {
        const response = await fetch(`/api/channels/${channelId}/updates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, user_id: parseInt(userId) })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to post update');
        }

        // Clear input
        updateInput.value = '';
        document.getElementById('channelUpdateCharCount').textContent = '0 / 500';

        // Reload updates
        loadChannelUpdates(channelId);

    } catch (error) {
        console.error('Error posting update:', error);
        alert(`Failed to post update: ${error.message}`);
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Post Update';
    }
}

// Close channel detail view
function closeChannelDetail() {
    document.getElementById('channelDiscovery').style.display = 'block';
    document.getElementById('channelDetail').style.display = 'none';
}

// Load updates for a channel
async function loadChannelUpdates(channelId) {
    const feedContainer = document.getElementById('channelUpdatesFeed');
    feedContainer.innerHTML = '<div class="loading">Loading updates...</div>';

    try {
        const response = await fetch(`/api/channels/${channelId}/updates`);
        if (!response.ok) throw new Error('Failed to load updates');

        const updates = await response.json();
        console.log('Updates loaded:', updates);

        if (updates.length === 0) {
            feedContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">No updates yet</p>';
            return;
        }

        feedContainer.innerHTML = updates.map(update => `
            <div style="padding: 16px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; margin-bottom: 12px;">
                <p style="color: var(--color-text-primary); font-size: 15px; line-height: 1.5; margin-bottom: 8px;">${escapeHtml(update.content)}</p>
                <p style="color: rgb(113, 118, 123); font-size: 13px;">${new Date(update.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading updates:', error);
        feedContainer.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 40px;">Failed to load updates</p>';
    }
}

// Create channel card HTML
function createChannelCard(channel) {
    const followBtnText = channel.is_following ? 'Following' : 'Follow';
    const followBtnClass = channel.is_following ? 'btn-following' : 'btn-follow';

    return `
        <div class="channel-card" data-channel-id="${channel.id}" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; transition: all 0.2s; cursor: pointer;" onmouseover="this.style.background='rgba(255, 255, 255, 0.03)'" onmouseout="this.style.background='transparent'">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 20px; flex-shrink: 0;">
                ${channel.name.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">${escapeHtml(channel.name)}</div>
                <div style="color: rgb(113, 118, 123); font-size: 15px;">@${escapeHtml(channel.creator_username)} · ${channel.follower_count} followers</div>
                ${channel.description ? `<div style="color: var(--color-text-secondary); font-size: 14px; margin-top: 4px;">${escapeHtml(channel.description)}</div>` : ''}
            </div>
            <button class="channel-follow-btn ${followBtnClass}" data-channel-id="${channel.id}" onclick="event.stopPropagation()" style="padding: 8px 16px; border-radius: 9999px; font-weight: 700; font-size: 14px; border: 1px solid var(--color-primary); background: ${channel.is_following ? 'transparent' : 'var(--color-primary)'}; color: ${channel.is_following ? 'var(--color-primary)' : '#000'}; cursor: pointer; transition: all 0.2s; flex-shrink: 0;">
                ${followBtnText}
            </button>
        </div>
    `;
}

// Toggle follow/unfollow channel
async function toggleFollowChannel(channelId, button) {
    console.log('toggleFollowChannel called', { channelId, button });
    const isFollowing = button.classList.contains('btn-following');
    console.log('Is following:', isFollowing);

    // Get current user ID
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        alert('You must be logged in to follow channels');
        return;
    }

    let userId;
    try {
        const user = JSON.parse(userStr);
        userId = user.id;
        console.log('User ID:', userId);
    } catch (e) {
        console.error('Error parsing user:', e);
        alert('Error reading user data. Please log in again.');
        return;
    }

    try {
        console.log('Sending request to:', `/api/channels/${channelId}/follow`);
        const response = await fetch(`/api/channels/${channelId}/follow`, {
            method: isFollowing ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parseInt(userId) })
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Failed to toggle follow');
        }

        const data = await response.json();
        console.log('Success response:', data);

        // Update button
        if (data.following) {
            button.textContent = 'Following';
            button.classList.add('btn-following');
            button.classList.remove('btn-follow');
            button.style.background = 'transparent';
            button.style.color = 'var(--color-primary)';
        } else {
            button.textContent = 'Follow';
            button.classList.add('btn-follow');
            button.classList.remove('btn-following');
            button.style.background = 'var(--color-primary)';
            button.style.color = '#000';
        }

        console.log('Button updated successfully');

    } catch (error) {
        console.error('Error toggling follow:', error);
        alert(`Failed to update follow status: ${error.message}`);
    }
}

// Open Create Channel modal
function openCreateChannelModal() {
    document.getElementById('createChannelModal').classList.add('active');
    document.getElementById('channelName').value = '';
    document.getElementById('channelDescription').value = '';
    document.getElementById('channelName').focus();
}

// Close Create Channel modal
function closeCreateChannelModal() {
    document.getElementById('createChannelModal').classList.remove('active');
    // Reset to step 1
    setTimeout(() => goToChannelStep1(), 300);
}

// Go to step 2 (description)
function goToChannelStep2() {
    const name = document.getElementById('channelName').value.trim();

    if (!name) {
        alert('Please enter a channel name');
        document.getElementById('channelName').focus();
        return;
    }

    document.getElementById('channelStep1').style.display = 'none';
    document.getElementById('channelStep2').style.display = 'block';
    document.getElementById('createChannelModalTitle').textContent = 'Step 2 of 2';
    document.getElementById('channelDescription').focus();
}

// Go back to step 1 (name)
function goToChannelStep1() {
    document.getElementById('channelStep1').style.display = 'block';
    document.getElementById('channelStep2').style.display = 'none';
    document.getElementById('createChannelModalTitle').textContent = 'Create Update Channel';
}

// Create new channel
async function createChannel() {
    const name = document.getElementById('channelName').value.trim();
    const description = document.getElementById('channelDescription').value.trim();

    if (!name) {
        alert('Please enter a channel name');
        return;
    }

    // Get current user ID
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        alert('You must be logged in to create a channel');
        return;
    }

    let userId;
    try {
        const user = JSON.parse(userStr);
        userId = user.id;
    } catch (e) {
        alert('Error reading user data. Please log in again.');
        return;
    }

    const submitBtn = document.getElementById('submitChannelBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
        const response = await fetch('/api/channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, user_id: parseInt(userId) })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create channel');
        }

        const channel = await response.json();

        // Close modal
        closeCreateChannelModal();

        // Reload channels
        loadChannels();

        // Show success message
        alert(`Channel "${channel.name}" created successfully!`);

    } catch (error) {
        console.error('Error creating channel:', error);
        alert(error.message || 'Failed to create channel');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Channel';
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUpdatesFeature);
} else {
    initUpdatesFeature();
}
