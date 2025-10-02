-- Cleanup Tracker D1 Database Schema
-- Run: npx wrangler d1 execute cleanup-tracker-prod --file=./schema.sql

-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employeeId TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT DEFAULT 'technician',
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vin TEXT UNIQUE NOT NULL,
  stockNumber TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  trim TEXT,
  color TEXT,
  vehicleDescription TEXT,
  status TEXT DEFAULT 'available',
  location TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vin TEXT NOT NULL,
  stockNumber TEXT,
  vehicleDescription TEXT,
  serviceType TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'Pending',
  technicianId INTEGER,
  technicianName TEXT,
  assignedBy INTEGER,
  startedAt DATETIME,
  completedAt DATETIME,
  duration INTEGER DEFAULT 0,
  expectedDuration INTEGER DEFAULT 60,
  issues TEXT,
  notes TEXT,
  qcStatus TEXT DEFAULT 'pending',
  qcNotes TEXT,
  qcBy INTEGER,
  qcAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technicianId) REFERENCES users(id),
  FOREIGN KEY (assignedBy) REFERENCES users(id),
  FOREIGN KEY (qcBy) REFERENCES users(id)
);

-- Settings table
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (employeeId, name, pin, role) VALUES ('0000', 'Admin', '$2a$10$example', 'admin');

-- Insert default settings
INSERT INTO settings (key, value, description, category) VALUES
('site_title', 'Cleanup Tracker', 'Application title', 'general'),
('inventory_csv_url', '', 'Google Sheets CSV URL for inventory import', 'inventory');