# 🚀 Quick Deployment Guide - Food Tracker V2

**Vercel (Frontend) + Your Server (Backend)**

## 📋 Prerequisite Checklist

Before starting, you need:
- [ ] A GitHub account with the food-tracker-V2 repository
- [ ] A Supabase account
- [ ] A Vercel account
- [ ] A Linux server (VPS/Dedicated) with SSH access
- [ ] A domain name for your backend API
- [ ] OpenAI API key (for AI Coach feature)

---

## ⚡ Quick Start (30 minutes)

### Step 1: Database Setup (5 min)

1. Create a project on [supabase.com](https://supabase.com)
2. In Supabase Dashboard → SQL Editor
3. Open `food-tracker-server/db_schema.sql` from this repo
4. Copy all SQL and paste into Supabase SQL Editor
5. Click **Run**

**Save these credentials:**
```
SUPABASE_URL = your-project.supabase.co
SUPABASE_SERVICE_KEY = (find in Settings → API)
```

---

### Step 2: Deploy Backend to Your Server (15 min)

#### On your server (via SSH):

```bash
# 1. Connect to your server
ssh user@your-server-ip

# 2. Install dependencies (one-time)
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx
sudo npm install -g pm2

# 3. Clone project
cd /home/user
git clone https://github.com/YOUR_USERNAME/food-tracker-V2.git
cd food-tracker-V2/food-tracker-server

# 4. Install and build
npm install
npm run build

# 5. Create .env file
nano .env
```

Paste this into .env (fill in your real values):
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
OPENAI_API_KEY=sk-your-openai-key-here
PORT=3000
NODE_ENV=production
CLIENT_URL=https://your-app.vercel.app
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

```bash
# 6. Start with PM2
pm2 start dist/index.js --name "food-tracker-backend"
pm2 save
pm2 startup
```

#### Setup SSL with your domain:

```bash
# Point your domain (api.yourdomain.com) to your server IP first!

# Then get SSL:
sudo certbot --nginx -d api.yourdomain.com

# Create Nginx config
sudo nano /etc/nginx/sites-available/food-tracker
```

Paste:
```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable config
sudo ln -s /etc/nginx/sites-available/food-tracker /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

✅ Backend is now running on `https://api.yourdomain.com`

---

### Step 3: Deploy Frontend to Vercel (10 min)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your `food-tracker-V2` GitHub repository
4. Configure:
   - **Root Directory**: `food-tracker-client` (click Edit)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Environment Variables**
6. Add:
   - Name: `VITE_API_URL`
   - Value: `https://api.yourdomain.com`
7. Click **Deploy**

✅ Frontend is now live on `https://your-app.vercel.app`

---

## ✅ Testing

Open your app at `https://your-app.vercel.app` and:
- [ ] App loads without errors
- [ ] Open DevTools (F12) → Network tab
- [ ] Make an API request (e.g., load food list)
- [ ] Check that requests go to `https://api.yourdomain.com`
- [ ] Should return `200 OK` response

---

## 🔄 Continuous Deployment

### Frontend (Automatic)
Every time you `git push` to `main`:
1. Vercel detects the change
2. Automatically builds and deploys
3. Your app updates on Vercel URL

### Backend (Semi-Automatic)
We've set up GitHub Actions. To enable:
1. Go to GitHub repo → Settings → Secrets and variables
2. Add these secrets:
   - `SERVER_HOST`: your-server-ip
   - `SERVER_USER`: your-username
   - `SERVER_SSH_KEY`: (SSH private key)
   - `SERVER_PORT`: 22 (usually)

Every time you `git push` to `main` (food-tracker-server changes):
1. GitHub Actions tests and builds
2. Automatically deploys to your server via SSH
3. PM2 restarts your backend

---

## 📱 Production Checklist

- [ ] Supabase database is created and schema loaded
- [ ] Backend running on server with PM2
- [ ] Backend accessible via HTTPS with domain
- [ ] Frontend deployed on Vercel
- [ ] `VITE_API_URL` environment variable set on Vercel
- [ ] API requests from frontend reach backend successfully
- [ ] SSL certificates installed (HTTPS everywhere)

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot reach backend from frontend" | Check `VITE_API_URL` is set correctly in Vercel env vars |
| Backend won't start | SSH to server, run `pm2 logs food-tracker-backend` |
| CORS errors | Check backend CORS config allows your Vercel domain |
| SSL certificate expired | SSH to server, run `sudo certbot renew` |
| Vercel build fails | Check "Deployments" tab in Vercel Dashboard for error logs |

---

## 📚 Full Guide

For complete step-by-step instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Questions?** Check the full deployment guide or review the `.github/workflows/` folder for CI/CD setup.

Happy deploying! 🚀
