import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes/api';
import { setupBot } from './bot/setup';
import { setupCronJobs } from './utils/notifications';
const app = express();
app.use(cors({ origin: '*' })); // Разрешаем запросы с любого источника
app.use(express.json({ limit: '50mb' }));
// 1. Подключаем API
app.use('/api', apiRoutes);
// 2. НАСТРОЙКА ПУТИ К САЙТУ
const publicPath = path.join(process.cwd(), 'public');
console.log("📂 Пытаюсь найти сайт здесь:", publicPath);
if (fs.existsSync(publicPath)) {
    console.log("✅ Папка public найдена! Раздаю сайт.");
    app.use(express.static(publicPath));
    // ВАЖНОЕ ИЗМЕНЕНИЕ НИЖЕ:
    // Мы заменили '*' на /.*/ (Регулярное выражение)
    // Это исправляет ошибку "PathError"
    app.get(/.*/, (req, res) => {
        // Если запрос начинается с /api, но не был обработан выше -> 404
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API route not found' });
        }
        // Иначе отдаем React приложение
        res.sendFile(path.join(publicPath, 'index.html'));
    });
}
else {
    console.error("❌ ОШИБКА: Папка 'public' не найдена!");
    console.error("👉 Убедись, что ты скопировал папку 'dist' из клиента, переименовал в 'public' и положил в корень сервера.");
}
// Запуск бота и уведомлений
setupBot();
setupCronJobs();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
//# sourceMappingURL=index.js.map