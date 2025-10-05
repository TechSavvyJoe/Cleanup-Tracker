# Cleanup Tracker - Quick Reference Guide

## 🚀 Common Commands

### Development
```bash
# Start development (both client and server)
cd cleanup-tracker-app
npm run dev

# Start only client
npm run dev:client

# Start only server
npm run dev:server
```

### Production
```bash
# Deploy to production
./deploy.sh

# Manual deployment
cd cleanup-tracker-app
npm run install:all
npm run build
cd server
NODE_ENV=production pm2 start server.js --name cleanup-tracker

# Restart application
pm2 restart cleanup-tracker

# Stop application
pm2 stop cleanup-tracker

# View logs
pm2 logs cleanup-tracker

# Check status
pm2 status
```

### Health & Monitoring
```bash
# Run health check
node health-check.js

# Check API manually
curl http://localhost:5051/api/vehicles/count

# Monitor PM2 in real-time
pm2 monit

# View detailed logs
pm2 logs cleanup-tracker --lines 100
```

## 📁 Important Files & Directories

| Path | Purpose |
|------|---------|
| `cleanup-tracker-app/client/` | React frontend application |
| `cleanup-tracker-app/server/` | Express backend API |
| `cleanup-tracker-app/server/.env` | Environment configuration |
| `cleanup-tracker-app/server/.port` | Current server port (auto-generated) |
| `deploy.sh` | Production deployment script |
| `health-check.js` | System health verification |
| `SETUP.md` | Detailed setup instructions |
| `PRODUCTION-CHECKLIST.md` | Pre-deployment checklist |

## 🔑 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` or `development` |
| `PORT` | Server port | `5051` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/cleanup-tracker` |
| `JWT_SECRET` | Secret key for JWT tokens | (64-character random string) |
| `INVENTORY_CSV_URL` | Google Sheets CSV URL | (Google Sheets publish URL) |

## 👥 Default Users

Configure in database or through manager interface:
- Detailers: Use employee PIN (4 digits)
- Managers: Use employee ID + PIN
- Sales: Use employee ID + PIN

## 🌐 URLs & Endpoints

### Frontend (Development)
```
http://localhost:3000
```

### Backend API (Development)
```
http://localhost:5051
```

### Key API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vehicles` | GET | List all vehicles |
| `/api/vehicles/vin/:vin` | GET | Get vehicle by VIN |
| `/api/vehicles/search?q=` | GET | Search vehicles |
| `/api/jobs` | GET | List all jobs |
| `/api/jobs` | POST | Create new job |
| `/api/jobs/:id` | GET | Get job details |
| `/api/users` | GET | List users |
| `/api/users` | POST | Create user |
| `/api/v2/auth/login` | POST | User login |

## 🐛 Troubleshooting Quick Fixes

### App Won't Start
```bash
# Check if port is in use
lsof -i :5051

# Kill process on port
kill -9 $(lsof -t -i:5051)

# Restart PM2
pm2 restart cleanup-tracker
```

### MongoDB Connection Issues
```bash
# Check MongoDB status (if local)
sudo systemctl status mongod

# Test connection
mongosh mongodb://localhost:27017/cleanup-tracker

# In .env, verify MONGO_URI is correct
cat cleanup-tracker-app/server/.env | grep MONGO_URI
```

### Build Errors
```bash
# Clear and reinstall
cd cleanup-tracker-app
rm -rf node_modules client/node_modules server/node_modules
npm run install:all

# Clear build cache
rm -rf client/build
npm run build
```

### PM2 Issues
```bash
# Stop all processes
pm2 stop all

# Delete process
pm2 delete cleanup-tracker

# Clear PM2 logs
pm2 flush

# Restart PM2
pm2 restart cleanup-tracker
```

### Database Reset (Development Only)
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/cleanup-tracker

# Drop database
use cleanup-tracker
db.dropDatabase()

# Restart application
pm2 restart cleanup-tracker
```

## 📊 Monitoring Metrics

### Key Metrics to Monitor
- **Response Time**: Should be < 200ms average
- **Error Rate**: Should be < 1%
- **CPU Usage**: Should be < 70%
- **Memory Usage**: Should be < 80%
- **Active Jobs**: Track concurrent jobs
- **User Sessions**: Monitor active users

### Monitoring Commands
```bash
# System resources
htop
df -h

# PM2 monitoring
pm2 monit

# Nginx logs (if using)
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
pm2 logs cleanup-tracker --lines 50
```

## 🔄 Common Tasks

### Add New User
1. Log in as manager
2. Navigate to "Team" tab
3. Click "Add New User"
4. Enter details and assign role
5. User can log in with their PIN

### Update Inventory
1. Publish Google Sheet as CSV
2. Update `INVENTORY_CSV_URL` in `.env`
3. Restart application: `pm2 restart cleanup-tracker`
4. Or manually refresh: Click "Refresh Inventory" button

### Backup Database
```bash
# MongoDB dump
mongodump --uri="mongodb://localhost:27017/cleanup-tracker" --out=/backup/$(date +%Y%m%d)

# Compress backup
tar -czf backup-$(date +%Y%m%d).tar.gz /backup/$(date +%Y%m%d)
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Or upload new files manually

# Deploy updates
./deploy.sh

# Or manually:
cd cleanup-tracker-app
npm run install:all
npm run build
pm2 restart cleanup-tracker
```

## 🆘 Emergency Procedures

### Application Crashed
1. Check logs: `pm2 logs cleanup-tracker`
2. Check system resources: `htop`
3. Restart: `pm2 restart cleanup-tracker`
4. If still failing, check MongoDB connection
5. Review recent changes and consider rollback

### Database Issues
1. Check MongoDB status: `systemctl status mongod`
2. Check disk space: `df -h`
3. Review MongoDB logs: `/var/log/mongodb/mongod.log`
4. Restart MongoDB: `systemctl restart mongod`
5. Verify connection in `.env`

### High Load
1. Check concurrent users
2. Review slow queries in MongoDB
3. Add database indexes if needed
4. Consider scaling vertically (more resources)
5. Consider scaling horizontally (load balancing)

## 📞 Support Contacts

| Issue | Contact | Method |
|-------|---------|--------|
| Technical Issues | System Admin | [Contact Info] |
| Application Bugs | Developer | [Contact Info] |
| Database Issues | DB Admin | [Contact Info] |
| User Training | Manager | [Contact Info] |

## 📝 Notes

- Always test changes in development first
- Keep backups of production database
- Document all configuration changes
- Monitor logs after deployments
- Review security settings regularly

---

**Last Updated:** September 30, 2025  
**Version:** 1.0.0  
**Maintained By:** Mission Ford IT Team
