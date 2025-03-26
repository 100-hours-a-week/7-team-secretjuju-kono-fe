import axios from 'axios';

const api = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // 'X-XSRF-TOKEN': document.cookie.match('XSRF-TOKEN=([^;]+)')?.pop() || '',
  },
});

api.interceptors.request.use((request) => {
  console.log('Request Headers:', request.headers);
  console.log('Cookies:', document.cookie);
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('Error Response:', error.response);
    console.log('Error Config:', error.config);
    if (error.response?.status === 401) {
      console.log('Session:', document.cookie);
    }
    return Promise.reject(error);
  },
);

export default api;
