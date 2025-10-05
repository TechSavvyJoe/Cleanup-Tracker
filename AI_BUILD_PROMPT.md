# Cleanup Tracker - Complete System Specification

## Overview
Build a professional vehicle detailing management system for **Mission Ford of Dearborn**, a car dealership that needs to track vehicle cleanup/detailing jobs for their used inventory. The system allows detailers, sales people, and managers to track vehicle preparation work in real-time.

---

## Business Context
- **Business Name**: Mission Ford of Dearborn
- **Purpose**: Track detailing/cleanup jobs on used vehicles from start to completion
- **Users**: Detailers (who clean cars), Sales people (who request cleanups), Managers (who oversee everything)
- **Key Goal**: Real-time visibility into which vehicles are being worked on, by whom, and how long it takes

---

## Core Functionality

### 1. User Roles & Authentication
Three distinct user roles with different capabilities:

**Manager Role:**
- Full access to all features
- Can view all jobs across all technicians
- Can perform quality control (QC) approvals
- Can view analytics and reports
- Can manage settings
- Example: Joe Gallant (PIN: 1701)

**Detailer Role:**
- Clock in/out of jobs using VIN scan or manual entry
- Can start, pause, resume, and complete jobs
- Can add issues/notes to jobs
- View their own active and completed jobs
- Examples: Alfred (PIN: 1716), Brian (PIN: 1709)

**Salesperson Role:**
- Can view vehicle inventory
- Can request cleanups for vehicles
- Can see status of their requested vehicles
- Examples: Sarah Johnson (PIN: 2001), Mike Chen (PIN: 2002), Lisa Rodriguez (PIN: 2003)

**Authentication Method:**
- **PIN-based login** (4-digit PIN codes)
- Simple number pad interface (0-9 buttons)
- No username/password - just enter PIN and go
- Fast access for technicians on the shop floor

### 2. Vehicle Inventory Management

**Data Source:**
- Import vehicles from a **Google Sheets CSV** (published/public URL)
- CSV contains used car inventory with columns like:
  - Stock Number
  - VIN (Vehicle Identification Number)
  - Year, Make, Model, Body
  - Color, Odometer, Price
  - New/Used status
  - Age (days on lot)

**Vehicle Data Structure:**
```javascript
{
  stockNumber: "U12345",
  vin: "1HGBH41JXMN109186",
  year: 2022,
  make: "Ford",
  model: "F-150",
  body: "Crew Cab",
  drivetrain: "4WD",
  color: "Oxford White",
  odometer: "12,450",
  price: "$45,999",
  age: 14, // days on lot
  newUsed: "Used",
  status: "Available",
  lastCleaned: Date
}
```

**Inventory Features:**
- Auto-import on server startup
- Manual refresh endpoint: `POST /api/v2/vehicles/refresh`
- Search vehicles by stock number, VIN, make, model
- Filter by status (needs cleaning, in progress, completed)
- Display vehicle age (days on lot) - helps prioritize older inventory

### 3. Job/Work Order System

**Job Lifecycle:**
1. **Pending** - Job created, not started
2. **In Progress** - Detailer actively working
3. **Paused** - Detailer paused work (lunch break, need parts, etc.)
4. **Completed** - Detailer finished work
5. **QC Required** - Needs manager quality check
6. **QC Approved** - Manager approved, job fully done

**Job Data Structure:**
```javascript
{
  technicianId: "user-id",
  technicianName: "Alfred",
  vin: "1HGBH41JXMN109186",
  stockNumber: "U12345",
  vehicleDescription: "2022 Ford F-150 Crew Cab",
  year: "2022",
  make: "Ford",
  model: "F-150",
  vehicleColor: "Oxford White",
  serviceType: "Cleanup", // or Detail, Delivery, Rewash, FCTP, Touch-up
  status: "In Progress",
  startTime: Date,
  endTime: Date,
  completedAt: Date,
  pausedAt: Date,
  pauseReason: "Waiting for parts",
  resumedAt: Date,
  duration: 45, // minutes
  expectedDuration: 60, // minutes
  priority: "Normal", // or High, Urgent
  salesPerson: "Mike Chen",
  issues: ["Stain on rear seat", "Small dent on door"],
  qcRequired: false,
  qcCompletedBy: "Joe Gallant",
  qcCompletedAt: Date,
  qcNotes: "Looks great",
  qcEmployeeNumber: "MGR001"
}
```

**Service Types & Expected Durations:**
- **Cleanup**: 45 minutes - Basic interior/exterior cleaning
- **Detail**: 120 minutes - Full interior and exterior detailing
- **Delivery**: 30 minutes - Final prep and delivery setup
- **Rewash**: 20 minutes - Quick wash and rinse
- **Lot Car**: 60 minutes - Lot positioning and prep
- **FCTP**: 90 minutes - Ford Customer Trade Program prep
- **Touch-up**: 30 minutes - Minor paint and interior touch-ups

**Job Actions:**
- Start job (scan VIN or manual select)
- Pause job (with reason: break, parts needed, etc.)
- Resume job
- Complete job
- Add issues/notes during work
- Request QC (for complex jobs)

### 4. VIN Scanning

**Scanner Requirements:**
- Use device camera to scan barcodes/QR codes
- Support formats:
  - **QR codes** (often contains full vehicle data)
  - **Code39** (VIN barcodes)
  - **Code128** (stock number barcodes)
- Use native `BarcodeDetector` API if available
- Fallback to ZXing library if browser doesn't support native API
- Parse VIN from QR code payload if embedded in JSON/text

**Scanner Workflow:**
1. Detailer opens scanner
2. Points camera at VIN barcode on vehicle
3. App reads VIN automatically
4. Looks up vehicle in inventory
5. Auto-fills job form with vehicle details
6. Detailer selects service type and starts job

### 5. Real-Time Dashboard

**Manager Dashboard:**
- Overview of all active jobs
- List of pending jobs
- Completed jobs for the day
- Performance metrics:
  - Average job duration by service type
  - Jobs completed per detailer
  - Vehicles awaiting cleanup
  - QC approval queue
- Filter by date, technician, service type
- Search by VIN or stock number

**Detailer Dashboard:**
- Current active job (timer running)
- Quick start new job button
- Recent completed jobs
- Personal stats (jobs today, avg time)
- Pause/Resume controls
- Issue reporting

**Salesperson Dashboard:**
- View all inventory
- See which vehicles need cleanup
- Request cleanup for specific vehicles
- Track status of their requested cleanups
- Filter by priority/status

### 6. Database Schema

**Users (V2User model):**
```javascript
{
  name: String,           // "Joe Gallant"
  role: String,           // "manager" | "detailer" | "salesperson"
  pin: String,            // "1701"
  employeeNumber: String, // "MGR001"
  phoneNumber: String,    // "555-0001"
  username: String,       // optional
  password: String,       // optional (for advanced auth)
  uid: String,            // optional unique ID
  department: String,     // optional
  timestamps: true
}
```

**Default Seeded Users:**
```javascript
// Managers
{ name: "Joe Gallant", role: "manager", pin: "1701", employeeNumber: "MGR001" }

// Detailers
{ name: "Alfred", role: "detailer", pin: "1716", employeeNumber: "DET001" }
{ name: "Brian", role: "detailer", pin: "1709", employeeNumber: "DET002" }

// Salespeople
{ name: "Sarah Johnson", role: "salesperson", pin: "2001", employeeNumber: "SALES001" }
{ name: "Mike Chen", role: "salesperson", pin: "2002", employeeNumber: "SALES002" }
{ name: "Lisa Rodriguez", role: "salesperson", pin: "2003", employeeNumber: "SALES003" }
```

---

## Technical Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (use MongoDB Atlas free tier for production)
- **Port**: 5051
- **API Version**: `/api/v2/` prefix for all routes

### Frontend
- **Framework**: React 18.x
- **Build Tool**: Create React App
- **Styling**: Tailwind CSS (via CDN)
- **State Management**: Redux (optional) or Context API
- **Camera/Scanner**: Browser native APIs with fallbacks

### Database
- **Development**: In-memory MongoDB (mongodb-memory-server)
- **Production**: MongoDB Atlas (free tier)
- **Connection**: Set `MONGO_URI` in environment variables

### Environment Variables
```bash
# Server (.env)
PORT=5051
MONGO_URI=mongodb+srv://...  # MongoDB Atlas connection string
INVENTORY_CSV_URL=https://docs.google.com/spreadsheets/d/...  # Published Google Sheet
SKIP_CSV_IMPORT=false  # Set to true to skip CSV import on startup (faster dev)
NODE_ENV=production  # or development
```

---

## Key Features & User Flows

### Detailer Workflow
1. **Login**: Enter PIN on number pad → Dashboard
2. **Start Job**:
   - Click "Start New Job"
   - Scan VIN or search vehicle
   - Select service type (Cleanup, Detail, etc.)
   - Job timer starts automatically
3. **During Job**:
   - Pause if needed (lunch, parts, etc.)
   - Add issues/notes as discovered
   - Resume when ready
4. **Complete Job**:
   - Click "Complete"
   - Add final notes
   - Job marked completed with total duration

### Manager Workflow
1. **Login**: Enter manager PIN → Manager Dashboard
2. **Monitor**:
   - See all active jobs in real-time
   - View which detailers are working on what
   - Check job durations vs expected times
3. **QC Approval**:
   - Review jobs marked "QC Required"
   - Inspect vehicle
   - Approve or send back with notes
4. **Reports**:
   - Daily/weekly job completion stats
   - Average duration by service type
   - Detailer performance metrics

### Salesperson Workflow
1. **Login**: Enter sales PIN → Sales Dashboard
2. **View Inventory**: Browse used car inventory
3. **Request Cleanup**: Select vehicle, request cleanup
4. **Track Status**: See which vehicles are cleaned and ready to show

---

## UI/UX Requirements

### Design Principles
- **Clean, professional appearance** - No cluttered or cramped layouts
- **Large touch targets** - Easy to tap on tablets/mobile devices
- **Minimal navigation** - Everything accessible within 2-3 clicks
- **Real-time updates** - Show live job status without refresh
- **Fast login** - PIN pad for quick access (no typing usernames)

### Login Screen
- Large circular logo/icon at top
- "Cleanup Tracker" title
- "Mission Ford of Dearborn" subtitle
- Simple tagline: "Professional vehicle detailing management system"
- Number pad (1-9, 0, Clear, Submit buttons)
- "Enter your 4-digit PIN to continue"
- Clean white/gray background with subtle gradients

### Color Scheme
- **Primary**: Blue/Ford blue tones
- **Success**: Green (completed jobs)
- **Warning**: Yellow/Orange (paused, needs attention)
- **Danger**: Red (overdue, issues)
- **Neutral**: Gray/white (backgrounds, cards)

### Responsive Design
- **Desktop**: Full dashboard layouts, multi-column views
- **Tablet**: Optimized for shop floor use, large buttons
- **Mobile**: Single column, priority on scanner and quick actions

---

## API Endpoints

### Authentication
- `POST /api/v2/auth/login` - Login with PIN, returns user object
- `GET /api/v2/auth/me` - Get current user (if using sessions)

### Users
- `GET /api/v2/users` - List all users
- `POST /api/v2/users` - Create new user
- `PUT /api/v2/users/:id` - Update user
- `DELETE /api/v2/users/:id` - Delete user

### Vehicles
- `GET /api/v2/vehicles` - List all vehicles (with search/filter)
- `GET /api/v2/vehicles/:vin` - Get vehicle by VIN
- `POST /api/v2/vehicles/refresh` - Manually trigger CSV import
- `GET /api/v2/vehicles/stats` - Vehicle inventory statistics

### Jobs
- `GET /api/v2/jobs` - List jobs (filter by status, technician, date)
- `POST /api/v2/jobs` - Create new job
- `PUT /api/v2/jobs/:id` - Update job (status, notes, etc.)
- `POST /api/v2/jobs/:id/start` - Start job
- `POST /api/v2/jobs/:id/pause` - Pause job
- `POST /api/v2/jobs/:id/resume` - Resume job
- `POST /api/v2/jobs/:id/complete` - Complete job
- `POST /api/v2/jobs/:id/qc` - Mark QC required
- `POST /api/v2/jobs/:id/approve` - Manager QC approval
- `GET /api/v2/jobs/stats` - Job statistics and analytics

### Service Types
- `GET /api/v2/service-expectations` - Get service types with expected durations

### Health Check
- `GET /api/v2/health` - API health check
- `GET /api/v2/diag` - Diagnostic info (users, DB status)

---

## Deployment Strategy

### Development
1. Run MongoDB in-memory for quick testing
2. Use `SKIP_CSV_IMPORT=true` to speed up server restarts
3. React dev server proxies API calls to backend
4. Backend runs on port 5051

### Production
1. **Database**: MongoDB Atlas free tier (persistent across devices)
2. **Backend**: Deploy to Railway, Render, or Fly.io
3. **Frontend**: Build React app (`npm run build`)
4. **Serving**: Backend serves React build from `client/build` directory
5. **Environment**: Set all environment variables in hosting platform
6. **Alternative Frontend Host**: Can deploy to Cloudflare Pages (static build)

### File Structure
```
cleanup-tracker-app/
├── server/
│   ├── server.js           # Main Express server
│   ├── models/
│   │   ├── V2User.js       # User model
│   │   ├── Job.js          # Job/work order model
│   │   └── Vehicle.js      # Vehicle inventory model
│   ├── routes/
│   │   └── v2.js           # API routes
│   ├── .env                # Environment variables
│   └── package.json
├── client/
│   ├── public/
│   │   └── index.html      # HTML template (Tailwind CDN)
│   ├── src/
│   │   ├── App.js          # Main React app
│   │   ├── pages/
│   │   │   ├── SimpleLogin.js        # PIN login page
│   │   │   ├── DetailerPage.js       # Detailer dashboard
│   │   │   ├── ManagerDashboard.js   # Manager dashboard
│   │   │   └── Dashboard.js          # Sales dashboard
│   │   ├── components/     # Reusable UI components
│   │   ├── utils/          # Helper functions
│   │   └── store.js        # State management
│   └── package.json
└── README.md
```

---

## Important Implementation Notes

### CSV Import
- Server fetches CSV from Google Sheets URL on startup
- Parses CSV and upserts vehicles into MongoDB
- Keeps existing vehicle data, only updates changes
- Can be triggered manually via API endpoint
- Include error handling for network failures

### VIN Scanning
- Use feature detection for `BarcodeDetector` API
- Implement ZXing fallback for browsers without native support
- Handle both QR codes (may contain JSON) and 1D barcodes (raw VIN)
- Provide manual VIN entry option if camera fails
- Show camera permission prompts clearly

### Time Tracking
- Store timestamps in UTC
- Calculate duration in minutes
- Handle paused time correctly (subtract pause duration)
- Show elapsed time during active jobs (live timer)
- Display expected vs actual duration comparisons

### Data Persistence
- Use MongoDB Atlas for production (free tier is sufficient)
- All data persists across sessions and devices
- Multiple users can access simultaneously
- Real-time updates (consider WebSockets for live dashboard)

### Performance
- Index VIN and stockNumber fields for fast lookups
- Cache vehicle list in memory for quick searches
- Paginate large job lists
- Lazy load images if showing vehicle photos

### Security Considerations
- PINs are simple (4 digits) - acceptable for internal use
- For external deployment, consider:
  - HTTPS only
  - Rate limiting on login endpoint
  - JWT tokens for session management
  - Role-based access control enforcement
- Don't expose sensitive vehicle pricing data to detailers

---

## Success Metrics
- Detailers can start a job in under 10 seconds
- Managers see real-time job status without refresh
- Average job duration tracked and compared to expectations
- 100% of vehicles have cleanup history
- Zero paper tracking - all digital

---

## Future Enhancements (Not Required for MVP)
- Photo uploads (before/after vehicle photos)
- Push notifications (job completed, QC required)
- Calendar view for scheduled cleanups
- Parts inventory tracking
- Customer notes/preferences
- Integration with dealership DMS system
- Mobile native app (iOS/Android)
- Offline mode with sync
- Advanced reporting/analytics dashboard

---

## Critical Requirements Summary

✅ **Must Have:**
- PIN-based authentication (4-digit number pad)
- Three user roles: Manager, Detailer, Salesperson
- Vehicle inventory from Google Sheets CSV
- Job tracking (start, pause, resume, complete)
- VIN barcode/QR scanning
- Real-time dashboard for each role
- Service type selection with expected durations
- Time tracking with pause/resume
- MongoDB persistence (Atlas for production)
- Clean, professional UI (not cramped or tiny)
- Backend serves production React build
- Port 5051

❌ **Do NOT:**
- Make CSS overrides that shrink everything to 12px font size
- Add aggressive viewport restrictions that break layout
- Create cramped, cluttered interfaces
- Require complex username/password authentication
- Store data only in browser (must use MongoDB)
- Make separate frontend and backend deployments initially

---

## Final Notes

This is a **working production system** for a real car dealership. The focus is on:
1. **Speed** - Detailers need fast access (PIN login, quick job start)
2. **Simplicity** - Intuitive interfaces, minimal training required
3. **Reliability** - Persistent data, no data loss
4. **Real-time** - Managers see what's happening now
5. **Professional appearance** - Clean, modern design that reflects well on the business

The system should feel like a professional tool, not a rushed prototype. Quality over quantity of features.
