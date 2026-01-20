import axios from 'axios';

// API базовый URL из переменной окружения
// При разработке используется локальный сервер (http://localhost:3000)
// При деплое на Vercel используется значение из переменной VITE_API_URL
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: apiUrl
});

export default api;