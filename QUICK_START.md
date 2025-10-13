# Quick Start Guide - Cleanup Tracker

This guide will help you get the Cleanup Tracker application running on your local machine.

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Starting the Application

### Option 1: Start Both Server and Client Together

From the project root directory:

```bash
# 1. Navigate to the server directory
cd cleanup-tracker-app/server

# 2. Make sure dependencies are installed
npm install

# 3. Start the server (it will run on port 5051)
npm start
```

The server will:
- Start on port 5051 (or the next available port if 5051 is in use)
- Use an in-memory MongoDB database (no MongoDB installation required)
- Seed 6 default users automatically
- Import inventory data from Google Sheets
- Serve the built client application

### Option 2: Development Mode (Separate Server and Client)

**Terminal 1 - Start the Server:**
```bash
cd cleanup-tracker-app/server
npm install  # if not already done
npm start
```

**Terminal 2 - Start the Client (for development):**
```bash
cd cleanup-tracker-app/client
npm install  # if not already done
npm start
```

This will start the client development server on port 3000.

### Building the Client for Production

If you've made changes to the client code, rebuild it:

```bash
cd cleanup-tracker-app/client
npm run build
```

The server will automatically serve the built client files from the `build` directory.

## Accessing the Application

Once the server is running:

- **Main Application**: http://localhost:5051
- **API Health Check**: http://localhost:5051/api/health
- **Development Client** (if running separately): http://localhost:3000

## Default Users

The application seeds these default test users with PINs for V2 login:

**Managers:**
- **PIN 1701** - Joe Gallant (Employee: MGR001)

**Detailers:**
- **PIN 1716** - Alfred (Employee: DET001)
- **PIN 1709** - Brian (Employee: DET002)

**Sales:**
- **PIN 2001** - Sarah Johnson (Employee: SALES001)
- **PIN 2002** - Mike Chen (Employee: SALES002)
- **PIN 2003** - Lisa Rodriguez (Employee: SALES003)

Simply enter the 4-digit PIN on the V2 login screen to access the system.

## Troubleshooting

### "This site can't be reached" / ERR_CONNECTION_REFUSED

This error means the server is not running. To fix:

1. Make sure you've started the server:
   ```bash
   cd cleanup-tracker-app/server
   npm start
   ```

2. Wait for the message: `Server started on port 5051`

3. If port 5051 is in use, the server will automatically try the next available port (5052, 5053, etc.)

### Port Already in Use

If you see `EADDRINUSE` error:

```bash
# Find what's using the port
lsof -i :5051

# Kill the process (replace PID with the actual process ID)
kill -9 PID
```

### Dependencies Issues

If you encounter module errors:

```bash
# Reinstall server dependencies
cd cleanup-tracker-app/server
rm -rf node_modules package-lock.json
npm install

# Reinstall client dependencies (if needed)
cd ../client
rm -rf node_modules package-lock.json
npm install
```

## Changes Made

### V2 is Now the Only Login Option

- The application now uses V2 interface by default
- The original V1 login option has been removed
- The Landing page has been updated to only show the V2 login link

## Environment Configuration

The server uses a `.env` file for configuration. A `.env` file should be created from `.env.example`:

```bash
cd cleanup-tracker-app/server
cp .env.example .env
```

The default configuration works out of the box with:
- Port 5051
- In-memory MongoDB (no external database needed)
- Development mode

## Need More Help?

- Check the main [README.md](./README.md)
- Review [LOCAL-SERVER-GUIDE.md](./LOCAL-SERVER-GUIDE.md) for Docker setup
- Look at server logs for detailed error messages
