# 🚀 Развертывание Food Tracker V2

## Обзор архитектуры

```
┌─────────────────────────────────────────┐
│         Vercel (Frontend)               │
│    https://your-app.vercel.app          │
│   React/Vite + Tailwind + NextUI        │
└──────────────┬──────────────────────────┘
               │
               ↓ (VITE_API_URL)
┌──────────────────────────────────────────┐
│      Your Server (Backend)               │
│    https://api.yourdomain.com            │
│      Node.js/Express + TypeScript        │
│      PM2 Process Manager                 │
└──────────────┬──────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│         Supabase (Database)              │
│    PostgreSQL + Auth + Storage           │
└──────────────────────────────────────────┘
```

---

## Этап 1: Подготовка репозитория

### 1.1 Убедитесь в наличии обязательных файлов
Проверьте наличие этих файлов в вашем репозитории:
- ✅ `food-tracker-client/vercel.json` (конфиг для Vercel)
- ✅ `food-tracker-client/src/api.ts` (использует VITE_API_URL)
- ✅ `food-tracker-server/.env.example` (шаблон переменных окружения)

### 1.2 Закоммитьте все изменения
```bash
git add .
git commit -m "Configure deployment: Vercel frontend + Server backend"
git push origin main
```

---

## Этап 2: Развертывание на Supabase (База данных)

### 2.1 Создайте проект на Supabase
1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Сохраните учетные данные:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Service Role Key**: (найдите в Settings → API)
   - **Anon Key**: (для клиента, если нужна прямая работа с БД)

### 2.2 Инициализируйте схему БД
1. В Supabase Dashboard откройте **SQL Editor**
2. Создайте новый query
3. Откройте файл `food-tracker-server/db_schema.sql`
4. Скопируйте весь SQL и вставьте в SQL Editor
5. Нажмите **Run**

---

## Этап 3: Развертывание Backend на сервере

### 3.1 Подготовка сервера (Linux Ubuntu/Debian)

Подключитесь к серверу по SSH:
```bash
ssh user@your-server-ip
```

Установите необходимое ПО:
```bash
# Обновите пакеты
sudo apt update && sudo apt upgrade -y

# Установите Node.js (версия 20+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установите PM2 (менеджер процессов)
sudo npm install -g pm2

# Установите Git (если не установлен)
sudo apt install -y git

# Установите Nginx (для SSL и проксирования)
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx
```

### 3.2 Клонируйте репозиторий

```bash
cd /home/user
git clone https://github.com/YOUR_USERNAME/food-tracker-V2.git
cd food-tracker-V2/food-tracker-server
npm install
npm run build
```

### 3.3 Настройте переменные окружения

```bash
nano .env
```

Вставьте и заполните (подставьте ваши реальные значения):
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
PORT=3000
NODE_ENV=production
CLIENT_URL=https://your-app.vercel.app
```

Сохраните: `Ctrl+O` → Enter → `Ctrl+X`

### 3.4 Запустите Backend с PM2

```bash
# Запустите приложение
pm2 start dist/index.js --name "food-tracker-backend"

# Настройте автозагрузку при перезагрузке сервера
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

Проверьте статус:
```bash
pm2 status
pm2 logs food-tracker-backend
```

### 3.5 Настройте Nginx и SSL (ВАЖНО!)

Создайте конфиг Nginx:
```bash
sudo nano /etc/nginx/sites-available/food-tracker
```

Вставьте (замените `api.yourdomain.com` на ваш домен):
```nginx
server {
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируйте конфиг:
```bash
sudo ln -s /etc/nginx/sites-available/food-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Получите SSL сертификат (Let's Encrypt):
```bash
sudo certbot --nginx -d api.yourdomain.com
```

Проверьте автообновление:
```bash
sudo systemctl enable certbot.timer
```

**Результат**: Backend доступен по адресу `https://api.yourdomain.com` ✅

---

## Этап 4: Развертывание Frontend на Vercel

### 4.1 Подготовьте GitHub репозиторий
1. Убедитесь, что все изменения закоммичены и запушены
2. Репозиторий должен быть публичным или вы должны дать Vercel доступ

### 4.2 Подключите к Vercel

#### Способ A: Через Vercel Dashboard (Рекомендуется)
1. Перейдите на [vercel.com/dashboard](https://vercel.com/dashboard)
2. Нажмите **Add New** → **Project**
3. Выберите ваш репозиторий `food-tracker-V2`
4. Настройте параметры:
   - **Framework Preset**: Vite
   - **Root Directory**: `food-tracker-client` (кликните Edit)
   - **Build Command**: `npm run build` (должно быть по умолчанию)
   - **Install Command**: `npm install`
   - **Output Directory**: `dist`

5. **Добавьте переменные окружения** (Environment Variables):
   - Нажмите **Environment Variables**
   - Добавьте новую переменную:
     - Name: `VITE_API_URL`
     - Value: `https://api.yourdomain.com`
     - Environments: Production, Preview, Development

6. Нажмите **Deploy**

Vercel автоматически:
- Создаст URL (типа `your-app.vercel.app`)
- Установит SSL сертификат
- Настроит автодеплой при каждом push в main

#### Способ B: Через Vercel CLI
```bash
cd food-tracker-client
npm i -g vercel
vercel
# Следуйте интерактивному процессу
```

### 4.3 Проверьте деплой
1. Откройте ваш Vercel URL
2. Откройте DevTools (F12) → Network
3. Проверьте, что API запросы идут на `https://api.yourdomain.com`

---

## Этап 5: Финальная проверка

### Чек-лист развертывания

- [ ] **Supabase**
  - [ ] Проект создан
  - [ ] БД схема загружена
  - [ ] Credentials сохранены

- [ ] **Backend сервер**
  - [ ] Node.js установлен
  - [ ] Репозиторий клонирован
  - [ ] `.env` файл создан с credentials
  - [ ] `npm install && npm run build` выполнены
  - [ ] PM2 запущен: `pm2 status` показывает "online"
  - [ ] Nginx настроен и перезагружен
  - [ ] SSL сертификат установлен (`https://`)

- [ ] **Frontend (Vercel)**
  - [ ] Проект подключен к Vercel
  - [ ] `VITE_API_URL` переменная окружения установлена
  - [ ] Build успешно пройден (нет ошибок в Deploy Logs)
  - [ ] Приложение открывается
  - [ ] API запросы работают (проверить в Network DevTools)

### Тестирование API

```bash
# Проверьте здоровье backend с сервера
curl https://api.yourdomain.com/health

# Или напрямую с Vercel frontend откройте консоль (F12):
fetch('https://api.yourdomain.com/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## Этап 6: Администрирование и Мониторинг

### Логи Backend
```bash
# Подключитесь к серверу
ssh user@your-server-ip

# Просмотрите логи
pm2 logs food-tracker-backend

# Смотрите в реальном времени
pm2 logs food-tracker-backend --lines 50 --follow
```

### Обновление Backend кода

```bash
cd /home/user/food-tracker-V2/food-tracker-server

# Получите новый код
git pull origin main

# Переустановите зависимости (если были изменения в package.json)
npm install

# Пересоберите TypeScript
npm run build

# Перезагрузите приложение
pm2 restart food-tracker-backend

# Проверьте статус
pm2 status
```

### Обновление Frontend

Обновление на Vercel происходит **автоматически**:
1. Вы делаете push в GitHub
2. Vercel автоматически обнаружит изменения
3. Автоматически запустит build и deploy
4. Ваше приложение обновится на `https://your-app.vercel.app`

Можете проверить статус deploy в Vercel Dashboard.

---

## Решение проблем

### ❌ "CORS error" или "Cannot access backend from frontend"
**Решение:**
1. Убедитесь, что backend запущен: `pm2 status`
2. Проверьте, что SSL работает: `curl https://api.yourdomain.com`
3. Проверьте переменную `VITE_API_URL` в Vercel Dashboard
4. В бэкенде должен быть настроен CORS:
   ```typescript
   app.use(cors({
       origin: 'https://your-app.vercel.app'
   }))
   ```

### ❌ Backend не запускается
```bash
# Подключитесь к серверу и смотрите логи
pm2 logs food-tracker-backend

# Если нужно перестартовать
pm2 restart food-tracker-backend

# Если критичное, удалите и запустите заново
pm2 delete food-tracker-backend
pm2 start dist/index.js --name "food-tracker-backend"
```

### ❌ Vercel build fails
1. Откройте Vercel Dashboard → Project → Deployments
2. Кликните на неудачный deploy
3. Посмотрите Error logs
4. Обычно: проблема с переменными окружения или неправильным путем к `food-tracker-client`

### ❌ SSL сертификат не работает
```bash
# На сервере
sudo certbot renew --dry-run  # Проверка
sudo certbot renew             # Обновить сертификаты
sudo systemctl restart nginx
```

---

## Быстрые команды для администратора

```bash
# Подключиться к серверу
ssh user@your-server-ip

# Просмотреть статус backend
pm2 status

# Смотреть логи
pm2 logs food-tracker-backend

# Перезагрузить backend
pm2 restart food-tracker-backend

# Обновить код и перезагрузить
cd /home/user/food-tracker-V2/food-tracker-server && git pull && npm install && npm run build && pm2 restart food-tracker-backend

# Проверить Nginx
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl restart nginx

# Проверить статус Nginx
sudo systemctl status nginx
```

---

## Безопасность

### ✅ Рекомендации

1. **Используйте .env файл** - никогда не закоммичивайте реальные credentials
2. **Установите SSL** - используйте HTTPS везде
3. **Ограничьте CORS** - укажите точный домен frontend
4. **Используйте Service Role Key** - только на backend, не на frontend
5. **Обновляйте зависимости**:
   ```bash
   npm audit fix
   npm update
   ```
6. **Регулярно проверяйте логи** для выявления аномалий

---

## Ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Setup Guide](https://supabase.com/docs/guides/getting-started)
- [PM2 Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt / Certbot](https://certbot.eff.org/)

---

**Успешного развертывания! 🚀**
