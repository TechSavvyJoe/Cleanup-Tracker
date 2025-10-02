-- Test user data for initial access
INSERT OR REPLACE INTO users (employeeId, name, pin, role) VALUES
('1234', 'Test User', '1234', 'technician'),
('0001', 'Manager', '0001', 'manager'),
('0000', 'Admin', '0000', 'admin');

-- Sample vehicle data
INSERT OR REPLACE INTO vehicles (vin, stockNumber, year, make, model, trim, color, vehicleDescription) VALUES
('1HGBH41JXMN109186', 'ST001', 2022, 'Honda', 'Civic', 'LX', 'White', '2022 Honda Civic LX'),
('WBAVA37553NL99999', 'ST002', 2023, 'BMW', '330i', 'Base', 'Black', '2023 BMW 330i'),
('1FMCU0D70GUA12345', 'ST003', 2021, 'Ford', 'Escape', 'SEL', 'Blue', '2021 Ford Escape SEL');