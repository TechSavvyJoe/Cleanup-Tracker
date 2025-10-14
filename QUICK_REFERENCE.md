# Cleanup Tracker - Quick Reference

## 🚀 Starting the Application

### Option 1: Use the Automated Script
```bash
cd "/Users/missionford/Cleanup Tracker"
./start-servers.sh
```

### Option 2: Manual Start
1. **Start Server:**
   ```bash
   cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/server"
   npm start
   ```

2. **Start Client (in new terminal):**
   ```bash
   cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/client"
   PORT=3001 npm start
   ```

## 🌐 Access Points

- **Web Application**: http://localhost:3001
- **API Server**: http://localhost:5051
- **Health Check**: http://localhost:5051/api/v2/health

## 🔐 Test Login Credentials

- **Employee ID**: `MGR001`
- **PIN**: `1701`
- **User**: Joe Gallant (Manager)

## 🛠️ Troubleshooting

### "Connection Refused" Error
1. Make sure both servers are running
2. Check ports aren't blocked: `lsof -i :5051` and `lsof -i :3001`
3. Restart using the startup script

### "Access Token Required" Error
This is normal for protected API endpoints. You need to:
1. Login first to get a JWT token
2. Include token in Authorization header: `Bearer YOUR_TOKEN`

### Authentication Test
```bash
# Login
curl -X POST http://localhost:5051/api/v2/auth/login \
     -H "Content-Type: application/json" \
     -d '{"employeeId":"MGR001","pin":"1701"}'

# Use the returned accessToken for protected endpoints
curl -X GET http://localhost:5051/api/v2/jobs \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📋 Default Seeded Users

The application automatically seeds these users:
- MGR001 - Joe Gallant (Manager) - PIN: 1701
- TT001 - Mike Johnson (Technician) - PIN: 1234
- TT002 - Sarah Davis (Technician) - PIN: 2345
- TT003 - David Wilson (Technician) - PIN: 3456
- TT004 - Lisa Brown (Technician) - PIN: 4567
- TT005 - Chris Miller (Technician) - PIN: 5678