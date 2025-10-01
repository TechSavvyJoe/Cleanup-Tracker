# Cleanup Tracker Deployment Guide

## Production-Ready Setup

### Prerequisites
- Node.js 18+ (tested with v23.4.0)
- MongoDB instance (local or cloud)
- Environment variables configured

### Environment Configuration

1. **Server Environment Variables** (copy from `cleanup-tracker-app/server/.env.example`):
   ```bash
   MONGO_URI=mongodb://localhost:27017/cleanup-tracker
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=5051
   NODE_ENV=production
   INVENTORY_CSV_URL=https://your-google-sheets-csv-url
   ```

2. **Security Requirements**:
   - `JWT_SECRET` MUST be set to a secure random string in production
   - Use HTTPS in production
   - Configure CORS for your domain

### Build & Deploy

#### Local Development
```bash
# Install dependencies
cd cleanup-tracker-app
npm run install:all

# Development mode (client + server)
npm run dev

# Production mode
npm run start:prod
```

#### Production Deployment

1. **Build Client**:
   ```bash
   cd cleanup-tracker-app/client
   npm run build
   ```

2. **Configure Environment**:
   ```bash
   cd ../server
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Start Server**:
   ```bash
   NODE_ENV=production node server.js
   ```

#### Cloudflare Pages (Alternative)
The project includes Cloudflare Pages configuration:
```bash
# Deploy to Cloudflare Pages
npm run build
wrangler pages deploy cleanup-tracker-app/client/build
```

### Architecture Overview

- **Frontend**: React 18 + Redux + React Router v6
- **Backend**: Express.js + MongoDB/Mongoose
- **Database**: MongoDB (with in-memory fallback for development)
- **Authentication**: JWT tokens
- **Build Tool**: Create React App

### Security Features

✅ **Implemented**:
- JWT secret validation in production
- Input sanitization
- XSS protection utilities
- Secure environment variable handling
- Updated dependencies (no critical vulnerabilities)

✅ **Security Headers** (recommended for production):
```javascript
// Add to server.js for production
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### Performance Optimizations

✅ **Completed**:
- React 18 with concurrent features
- Production build optimization
- Efficient MongoDB connection handling
- In-memory database fallback for development

### Monitoring & Logging

The application includes:
- Structured error logging
- Performance monitoring utilities
- MongoDB connection status tracking
- Inventory import status reporting

### Troubleshooting

**Common Issues**:

1. **MongoDB Connection Failed**:
   - Check `MONGO_URI` environment variable
   - Ensure MongoDB is running
   - App falls back to in-memory DB in development

2. **JWT Secret Error**:
   - Set `JWT_SECRET` environment variable in production
   - Use a cryptographically secure random string

3. **Build Errors**:
   - Clear node_modules and reinstall dependencies
   - Check Node.js version compatibility

4. **Port Conflicts**:
   - Server automatically finds available port (5051-5151)
   - Check `.port` file for chosen port

### Next Steps for Production

1. Set up MongoDB Atlas or dedicated MongoDB instance
2. Configure domain and SSL certificate
3. Set up CI/CD pipeline
4. Configure monitoring (e.g., Sentry for error tracking)
5. Set up backup strategy for MongoDB
6. Configure rate limiting and DDoS protection