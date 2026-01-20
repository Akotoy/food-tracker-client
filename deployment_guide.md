# Deployment Guide for Food Tracker V2

## 1. Database Setup (Supabase)
Before deploying code, you must update your database schema.

1.  Open your Supabase Project Dashboard.
2.  Go to **SQL Editor**.
3.  Open the file `food-tracker-server/db_schema.sql` from this repository.
4.  Copy its content and paste it into the SQL Editor.
5.  Click **Run**.

## 2. Backend Deployment (Custom Server)
These steps assume you have a Linux server (Ubuntu/Debian) with SSH access.

### Step 2.1: Prepare Server
Connect to your server:
```bash
ssh user@your-server-ip
```

Install Node.js (v20+), Git, and PM2:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### Step 2.2: Clone & Configure
```bash
# Clone repository
git clone https://github.com/Akotoy/food-tracker-client.git food-tracker
cd food-tracker/food-tracker-server

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Step 2.3: Environment Variables
Create the `.env` file on the server (User mentioned it already exists, checking usually doesn't hurt, but skip creation if confident).
```bash
nano .env
```
Paste your Supabase credentials and OpenAI key:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
OPENAI_API_KEY=sk-...
PORT=3000
```
Save with `Ctrl+O`, then exit `Ctrl+X`.

### Step 2.4: Start Backend
```bash
# Start with PM2
pm2 start dist/index.js --name "food-backend"

# Save list so it restarts on reboot
pm2 save
pm2 startup
```
Your backend is now running on `http://your-server-ip:3000`.

---

## 3. Frontend Deployment (Vercel)
Vercel is the easiest way to deploy Vite React apps.

### Step 3.1: Install Vercel CLI (Optional) or Use Web UI
**Method A: Web UI (Recommended)**
1.  Push your latest changes to GitHub.
2.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
3.  Click **Add New...** -> **Project**.
4.  Import your GitHub repository `food-tracker-V2`.
5.  **Root Directory**: Click "Edit" and select `food-tracker-client`.
6.  **Build Command**: `vite build` (Default)
7.  **Output Directory**: `dist` (Default)
8.  **Environment Variables**:
    *   `VITE_API_URL`: `http://your-server-ip:3000` (The address of your backend)
9.  Click **Deploy**.

### Step 3.2: Fix Mixed Content (Important!)
Since your Vercel app will be HTTPS and your server might be HTTP (IP address), browsers will block requests.
**Solution 1 (Proper):** Buy a domain for your backend and set up SSL (Certbot + Nginx).
**Solution 2 (Quick):** Use a tunneling service like Cloudflare Tunnel or just deploy Frontend to the same server (nginx serving static files).

**Since you asked for Vercel + Server, you highly likely need SSL on your server.**

### Quick SSL Setup (Nginx)
If you have a domain pointing to your server IP:
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/default
```
Replace content with:
```nginx
server {
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Then run:
```bash
sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com
```
Now update `VITE_API_URL` on Vercel to `https://your-domain.com`.
