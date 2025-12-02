import api from './api';

export const likePost = async (postId: number, userId: number) => {
    return api.post(`/posts/${postId}/like`, { user_id: userId });
};

export const unlikePost = async (postId: number, userId: number) => {
    // Use the same toggle endpoint
    return api.post(`/posts/${postId}/like`, { user_id: userId });
};

export const repostPost = async (postId: number, userId: number) => {
    return api.post(`/posts/${postId}/repost`, { user_id: userId });
};

export const unrepostPost = async (postId: number, userId: number) => {
    // Use the same toggle endpoint  
    return api.post(`/posts/${postId}/repost`, { user_id: userId });
};

export const bookmarkPost = async (postId: number, userId: number) => {
    return api.post(`/posts/${postId}/bookmark`, { user_id: userId });
};

export const unbookmarkPost = async (postId: number, userId: number) => {
    // Use the same toggle endpoint
    return api.post(`/posts/${postId}/bookmark`, { user_id: userId });
};
