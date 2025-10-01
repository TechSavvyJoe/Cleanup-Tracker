# Production Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Environment Configuration
- [ ] Copy `.env.production` to `.env`
- [ ] Set strong `JWT_SECRET` (64+ character random string)
- [ ] Configure `MONGO_URI` (MongoDB Atlas or production instance)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `INVENTORY_CSV_URL` (if using Google Sheets sync)
- [ ] Review and adjust rate limiting settings

### Security
- [ ] Generate secure JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Verify MongoDB connection uses authentication
- [ ] Ensure MongoDB Atlas IP whitelist is configured
- [ ] Review CORS settings (restrict to your domain)
- [ ] Enable HTTPS/SSL certificate
- [ ] Set up firewall rules (allow only necessary ports)
- [ ] Disable unnecessary services

### Dependencies
- [ ] Run `npm run install:all` in cleanup-tracker-app
- [ ] Verify Node.js version (18+)
- [ ] Check for security vulnerabilities: `npm audit`
- [ ] Update outdated packages if needed

### Build
- [ ] Test build process: `npm run build`
- [ ] Verify build completes without errors
- [ ] Check build output size (should be < 10MB)
- [ ] Test built application locally

## Deployment

### Server Setup
- [ ] Install Node.js 18+
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install Nginx (if using reverse proxy)
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL with Let's Encrypt/Certbot
- [ ] Configure log rotation

### Application Deployment
- [ ] Upload/clone code to server
- [ ] Install dependencies
- [ ] Build client application
- [ ] Start with PM2: `pm2 start server.js --name cleanup-tracker`
- [ ] Enable PM2 startup: `pm2 startup` and `pm2 save`
- [ ] Configure PM2 to restart on failure

### MongoDB Setup
- [ ] Create MongoDB database
- [ ] Create database user with appropriate permissions
- [ ] Configure database backups
- [ ] Set up monitoring/alerts
- [ ] Test connection from application server

## Post-Deployment Testing

### Functionality Tests
- [ ] Access application through browser
- [ ] Test login with different user roles
- [ ] Test VIN scanner functionality
- [ ] Create a test cleanup job
- [ ] Complete a test job
- [ ] Test job search and filtering
- [ ] Verify inventory sync works
- [ ] Test all user management functions
- [ ] Verify reports generate correctly

### Performance Tests
- [ ] Check page load times (< 3 seconds)
- [ ] Test with multiple concurrent users
- [ ] Monitor CPU and memory usage
- [ ] Check API response times
- [ ] Verify database query performance

### Security Tests
- [ ] Verify HTTPS works correctly
- [ ] Test authentication/authorization
- [ ] Check rate limiting is active
- [ ] Verify no sensitive data in logs
- [ ] Test CORS restrictions
- [ ] Scan for common vulnerabilities

### Health Checks
- [ ] Run `node health-check.js`
- [ ] Check PM2 status: `pm2 status`
- [ ] Review logs: `pm2 logs cleanup-tracker`
- [ ] Monitor error logs
- [ ] Set up automated health checks

## Monitoring & Maintenance

### Initial Monitoring (First Week)
- [ ] Monitor application logs daily
- [ ] Check error rates
- [ ] Monitor database performance
- [ ] Review user feedback
- [ ] Check server resource usage

### Ongoing Maintenance
- [ ] Set up automated backups (daily)
- [ ] Configure log rotation
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure error alerting (e.g., Sentry)
- [ ] Schedule regular security updates
- [ ] Plan for scaling if needed

## Rollback Plan

### Prepare Rollback Strategy
- [ ] Document current working version
- [ ] Keep backup of previous version
- [ ] Document rollback procedure:
  ```bash
  pm2 stop cleanup-tracker
  # Replace with backup version
  cd /path/to/backup
  npm install
  npm run build
  pm2 start server.js --name cleanup-tracker
  ```
- [ ] Test rollback procedure in staging

## Documentation

### Update Documentation
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document environment variables
- [ ] Create troubleshooting guide
- [ ] Document backup/restore procedures

### Team Training
- [ ] Train team on new system
- [ ] Provide user guides
- [ ] Set up support channel
- [ ] Document escalation procedures

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| System Admin | | | |
| Manager | | | |

## Notes

Deployment Date: _________________

Server Details:
- Hostname: _________________
- IP Address: _________________
- Domain: _________________

Database:
- MongoDB URI: _________________
- Database Name: _________________

Issues Encountered:
_________________________________
_________________________________
_________________________________

Resolution:
_________________________________
_________________________________
_________________________________

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| System Admin | | | |
| Developer | | | |
| Database Admin | | | |
| Manager | | | |
