import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import apiRoutes from './routes/api.js';
import { setupBot } from './bot/setup.js';
import { setupCronJobs } from './utils/notifications.js';

const app = express();

app.use(cors({
    origin: [
        'https://food-tracker-client-kafa.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Подключаем API
app.use('/api', apiRoutes);

// НАСТРОЙКА ПУТИ К САЙТУ
const publicPath = path.join(process.cwd(), 'public');

console.log("📂 Пытаюсь найти сайт здесь:", publicPath);

if (fs.existsSync(publicPath)) {
    console.log("✅ Папка public найдена! Раздаю сайт.");
    app.use(express.static(publicPath));

    app.get(/.*/, (req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API route not found' });
        }
        res.sendFile(path.join(publicPath, 'index.html'));
    });
} else {
    console.error("❌ ОШИБКА: Папка 'public' не найдена!");
}

// Запуск бота и уведомлений
setupBot();
setupCronJobs();

const PORT = process.env.PORT || 3000;

// HTTPS сервер
const certPath = path.join(process.cwd(), 'cert.pem');
const keyPath = path.join(process.cwd(), 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
    };
    https.createServer(options, app).listen(PORT, () => {
        console.log(`🚀 HTTPS Server running on https://185.5.207.57:${PORT}`);
    });
} else {
    app.listen(PORT, () => {
        console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
    });