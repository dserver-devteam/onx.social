import api from './api';

export const getUserProfile = async (username: string, currentUserId?: number) => {
    const params = currentUserId ? { current_user_id: currentUserId } : {};
    return api.get(`/users/profile/${username}`, { params });
};

export const getUserPosts = async (username: string, limit = 20, offset = 0) => {
    return api.get(`/posts/user/${username}`, { params: { limit, offset } });
};

export const followUser = async (userId: number, currentUserId: number) => {
    return api.post(`/users/${userId}/follow`, { user_id: currentUserId });
};

export const unfollowUser = async (userId: number, currentUserId: number) => {
    return api.delete(`/users/${userId}/follow`, { data: { user_id: currentUserId } });
};

export const updateUserProfile = async (userId: number, data: any) => {
    return api.put(`/users/${userId}`, data);
};

export const changePassword = async (userId: number, currentPassword: string, newPassword: string) => {
    return api.post(`/users/${userId}/change-password`, { current_password: currentPassword, new_password: newPassword });
};
