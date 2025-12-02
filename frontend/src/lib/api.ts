import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 (Unauthorized) globally if needed
        if (error.response && error.response.status === 401) {
            // Optional: Redirect to login or clear auth state
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;
