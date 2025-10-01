# Cleanup Tracker - Complete Setup Guide

## Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally OR MongoDB Atlas account

### Setup Steps

1. **Install Dependencies**
```bash
cd "Cleanup Tracker/cleanup-tracker-app"
npm run install:all
```

2. **Configure Environment**
```bash
cd server
# The .env file is already configured for local development
# No changes needed for local testing
```

3. **Start Development**
```bash
# From cleanup-tracker-app directory
npm run dev
```

The app will open at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5051

---

## Production Deployment

### Option 1: Traditional Server (Recommended for Auto Dealers)

**Requirements:**
- Ubuntu/Linux server or VPS
- MongoDB instance (Atlas or self-hosted)
- Domain name with SSL certificate

**Steps:**

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Deploy Application**
```bash
# Clone/upload your project
cd /var/www/cleanup-tracker

# Install dependencies
cd cleanup-tracker-app
npm run install:all

# Configure production environment
cd server
cp .env.production .env
nano .env  # Edit with your MongoDB URI and JWT secret
```

3. **Generate Secure JWT Secret**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_SECRET in .env
```

4. **Build and Start**
```bash
# Build client
npm run build

# Start with PM2
cd server
pm2 start server.js --name cleanup-tracker
pm2 save
pm2 startup  # Enable auto-start on reboot
```

5. **Setup Nginx Reverse Proxy**
```bash
sudo nano /etc/nginx/sites-available/cleanup-tracker
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cleanup-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### Option 2: Cloudflare Pages

**Note:** This project is configured for Cloudflare Pages but requires D1 database setup.

1. **Install Wrangler**
```bash
npm install -g wrangler
wrangler login
```

2. **Create D1 Database**
```bash
wrangler d1 create cleanup-tracker-prod
# Copy the database ID to wrangler.toml
```

3. **Deploy**
```bash
npm run build
wrangler pages deploy cleanup-tracker-app/client/build --project-name=cleanup-tracker
```

---

## MongoDB Setup

### Local Development (Already Configured)
- Uses MongoDB Memory Server if MongoDB not installed
- No setup needed for testing

### MongoDB Atlas (Production - Recommended)

1. Create account at mongodb.com/cloud/atlas
2. Create a free cluster
3. Add database user
4. Whitelist IP addresses (0.0.0.0/0 for any IP)
5. Get connection string
6. Update MONGO_URI in .env

Example connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cleanup-tracker?retryWrites=true&w=majority
```

---

## Security Checklist

### Required for Production:

- [ ] Generate strong JWT_SECRET (use crypto.randomBytes)
- [ ] Use MongoDB Atlas or secure MongoDB instance
- [ ] Enable HTTPS/SSL
- [ ] Restrict CORS to your domain
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Regular backups of MongoDB
- [ ] Monitor error logs
- [ ] Update NODE_ENV=production

---

## Monitoring & Maintenance

### Check Application Status
```bash
pm2 status
pm2 logs cleanup-tracker
```

### Monitor MongoDB
```bash
# Check connection
mongosh "your-connection-string"
```

### Update Application
```bash
cd /var/www/cleanup-tracker/cleanup-tracker-app
git pull  # or upload new files
npm run install:all
npm run build
pm2 restart cleanup-tracker
```

---

## Troubleshooting

### Port Already in Use
The server automatically finds an available port (5051-5151).
Check `.port` file for the actual port being used.

### MongoDB Connection Failed
- Verify MONGO_URI is correct
- Check MongoDB service is running
- Verify network connectivity
- Check firewall rules

### Build Errors
```bash
# Clear caches and reinstall
rm -rf node_modules
npm run install:all
```

### Cannot Access from Network
- Check firewall: `sudo ufw status`
- Allow port: `sudo ufw allow 80/tcp`
- Check Nginx: `sudo systemctl status nginx`

---

## Features

✅ **Vehicle Tracking** - VIN scanning & search  
✅ **Job Management** - Real-time cleanup tracking  
✅ **User Roles** - Detailers, Managers, Sales  
✅ **Auto-Import** - Google Sheets inventory sync  
✅ **Mobile-First** - Optimized for tablets & phones  
✅ **QC Review** - Quality control workflow  
✅ **Reports** - Performance analytics  

---

## Support

For issues:
1. Check logs: `pm2 logs cleanup-tracker`
2. Verify .env configuration
3. Test MongoDB connection
4. Check system resources

**Tech Stack:**
- Frontend: React 18, Redux, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB
- Deployment: Traditional VPS or Cloudflare Pages
