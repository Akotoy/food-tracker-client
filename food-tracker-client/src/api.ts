import axios from 'axios';

// Мы НЕ указываем http://localhost:3000. 
// Мы оставляем пустую строку, чтобы запрос шел на тот же домен (localhost:5173),
// а Vite уже перекинет его на сервер.
const api = axios.create({
    baseURL: '' 
});

export default api;