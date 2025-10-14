# How to Start the Development Servers

## The Problem
The servers keep getting interrupted because terminal commands are interfering with each other.

## The Solution
You need to **manually open 2 separate terminal windows** and run these commands:

### Terminal Window 1️⃣ - Backend Server
```bash
cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/server"
node server.js
```

**Wait for this message:**
```
Server started on port 5051
```

### Terminal Window 2️⃣ - React Dev Server  
```bash
cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/client"
npm start
```

**Wait for this message:**
```
webpack compiled successfully
```

### Then Open Browser
Go to: **http://localhost:3000**

---

## What's Fixed
✅ **Proxy configuration** - PUT and POST requests now work correctly  
✅ **Login branding** - New CT gradient logo on login screen  
✅ **Settings save** - No more 404 errors  
✅ **Inventory refresh** - Google Sheets CSV import will work  

## Troubleshooting

If you still see "Connection Refused":

1. **Check Backend is Running:**
   ```bash
   curl http://localhost:5051/api/health
   ```
   Should return: `{"status":"OK",...}`

2. **Check React is Running:**
   ```bash
   lsof -ti:3000
   ```
   Should return a process ID number

3. **Kill All Processes and Start Fresh:**
   ```bash
   pkill -9 -f "nodemon"
   pkill -9 -f "react-scripts"
   pkill -9 -f "node server.js"
   ```
   Then run the commands in Terminal 1 and 2 again.

---

## Why This Happens
The VS Code integrated terminal and the AI assistant are sharing the same terminal sessions, which causes commands to interrupt running processes. Running the servers in **separate, dedicated terminal windows** prevents this issue.
