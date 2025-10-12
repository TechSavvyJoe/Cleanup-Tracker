# Cleanup Tracker - Local Server Setup Guide

## Overview

Your Cleanup Tracker application is now configured to run as a local server on your Mac using Docker. This guide covers everything you need to know to manage and use your application.

## What's Running

Your setup includes:
- **MongoDB Database**: Running in a Docker container with persistent storage
- **Cleanup Tracker App**: Your Node.js backend and React frontend
- **Auto-start**: Configured to start automatically when your Mac boots

## Quick Reference

### Accessing Your Application

- **Frontend/App**: http://localhost:3000 or http://cleanup-tracker.local:3000
- **API Backend**: http://localhost:5051 or http://cleanup-tracker.local:5051
- **API Health Check**: http://localhost:5051/api/health

### Default Users

The application comes with 6 pre-configured users:
1. **admin@cleanup.com** - Admin (password: admin123)
2. **manager@cleanup.com** - Manager (password: manager123)
3. **detailer@cleanup.com** - Detailer (password: detailer123)
4. **sales@cleanup.com** - Sales (password: sales123)
5. **john@cleanup.com** - John Doe (password: john123)
6. **jane@cleanup.com** - Jane Smith (password: jane123)

## Managing Your Server

### Start the Application
```bash
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose up -d
```

### Stop the Application
```bash
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose down
```

### Restart the Application
```bash
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose restart
```

### View Logs
```bash
# View all logs
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose logs -f

# View only app logs
docker-compose logs -f app

# View only database logs
docker-compose logs -f mongodb
```

### Check Status
```bash
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose ps
```

### Rebuild After Code Changes
```bash
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Auto-Start Configuration

Your application is configured to start automatically when your Mac boots:

1. **Docker Desktop** starts on login (configured)
2. **Containers** restart automatically (restart: always policy)

To disable auto-start:
```bash
# Stop containers from auto-restarting
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose down

# Disable Docker Desktop from starting on login
# Go to Docker Desktop → Settings → General → Uncheck "Start Docker Desktop when you log in"
```

## Data Persistence

Your data is stored in Docker volumes that persist even when containers are stopped:
- **mongodb_data**: Database files
- **mongodb_config**: MongoDB configuration

### Backup Your Data
```bash
# Backup MongoDB data
docker exec cleanup-tracker-mongodb mongodump --out=/data/backup
docker cp cleanup-tracker-mongodb:/data/backup ~/Cleanup-Tracker-Backup-$(date +%Y%m%d)
```

### View Volumes
```bash
docker volume ls | grep cleanup-tracker
```

## Accessing from Other Devices

To access your application from other devices on your network (phones, tablets, other computers):

1. Find your Mac's IP address:
```bash
ipconfig getifaddr en0  # WiFi
# or
ipconfig getifaddr en1  # Ethernet
```

2. From other devices, use: `http://YOUR_MAC_IP:5051` or `http://YOUR_MAC_IP:3000`

3. Make sure macOS Firewall allows incoming connections (System Settings → Network → Firewall)

## Local Domain Name

To use `cleanup-tracker.local` instead of `localhost`, run this command (requires password):
```bash
echo "127.0.0.1 cleanup-tracker.local" | sudo tee -a /etc/hosts
```

Then access via:
- http://cleanup-tracker.local:3000 (Frontend)
- http://cleanup-tracker.local:5051 (API)

## Troubleshooting

### Containers Won't Start
```bash
# Check Docker Desktop is running
docker --version

# Check what's using the ports
lsof -i :5051
lsof -i :3000
lsof -i :27017

# Restart Docker Desktop
# Click Docker icon in menu bar → Restart
```

### Application Not Responding
```bash
# Check container status
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app
docker-compose ps

# View logs for errors
docker-compose logs -f app

# Restart specific container
docker-compose restart app
```

### Database Connection Issues
```bash
# Check MongoDB is healthy
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs -f mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Out of Disk Space
```bash
# Remove unused Docker images and containers
docker system prune -a

# Remove unused volumes (WARNING: This deletes data)
docker volume prune
```

### Reset Everything
```bash
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app

# Stop and remove everything (INCLUDING DATA)
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## Configuration Files

### Environment Variables
- **Server config**: `~/Projects/Cleanup-Tracker/cleanup-tracker-app/server/.env`
- **Client config**: `~/Projects/Cleanup-Tracker/cleanup-tracker-app/client/.env`

### Docker Configuration
- **docker-compose.yml**: `~/Projects/Cleanup-Tracker/cleanup-tracker-app/docker-compose.yml`
- **Dockerfile**: `~/Projects/Cleanup-Tracker/cleanup-tracker-app/Dockerfile`

## Updating the Application

When you make code changes:

```bash
cd ~/Projects/Cleanup-Tracker/cleanup-tracker-app

# Method 1: Quick rebuild
docker-compose down
docker-compose up -d --build

# Method 2: Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Performance Tips

1. **Allocate more resources to Docker**:
   - Docker Desktop → Settings → Resources
   - Increase CPUs: 4+ recommended
   - Increase Memory: 4GB+ recommended

2. **Monitor resource usage**:
```bash
docker stats
```

3. **Clean up regularly**:
```bash
docker system prune
```

## Security Notes

- The JWT secret in `.env` is auto-generated and secure
- Default user passwords should be changed in production
- MongoDB is only accessible from localhost (not exposed to network)
- Keep Docker Desktop updated for security patches

## Additional Resources

- **Docker Compose Docs**: https://docs.docker.com/compose/
- **MongoDB Docs**: https://www.mongodb.com/docs/
- **Original README**: `~/Projects/Cleanup-Tracker/cleanup-tracker-app/README.md`

## Support

For issues with the Cleanup Tracker application itself, refer to:
- `~/Projects/Cleanup-Tracker/cleanup-tracker-app/README.md`
- `~/Projects/Cleanup-Tracker/QUICK_START_GUIDE.md`

## System Information

- **Installation Date**: October 11, 2025
- **Docker Version**: Latest (installed October 2025)
- **Platform**: macOS (Intel x86_64)
- **Application Location**: `~/Projects/Cleanup-Tracker/cleanup-tracker-app`

---

**Need Help?** Check the logs first with `docker-compose logs -f` - most issues are clearly described in the error messages.
