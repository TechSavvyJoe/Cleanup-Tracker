import React, { useState, useEffect, useMemo } from 'react';
import { v2Request } from '../utils/v2Client';

// Logging utility
const Logger = {
  error: (message, error, context = {}) => {
    console.error(`[EnterpriseInventory Error] ${message}:`, {
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      context
    });
  }
};

const EnterpriseInventory = ({ theme = 'dark' }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Load vehicles data
  useEffect(() => {
    let isActive = true;

    const loadVehicles = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await v2Request('get', '/vehicles', null, {
          params: { limit: 500 },
          headers: { Accept: 'application/json' }
        });

        const payload = response?.data;
        if (!isActive) {
          return;
        }

        if (Array.isArray(payload)) {
          setVehicles(payload);
        } else if (payload?.success && Array.isArray(payload.vehicles)) {
          setVehicles(payload.vehicles);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        if (!isActive) {
          return;
        }
        Logger.error('Failed to load vehicles', err, { endpoint: '/vehicles' });
        setError(err.message || 'Failed to load vehicles');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadVehicles();

    return () => {
      isActive = false;
    };
  }, []);

  // Enhanced filtering and sorting
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = vehicles.filter(vehicle => {
      const vin = vehicle.vin || '';
      const stock = vehicle.stockNumber || '';
      const make = vehicle.make || '';
      const model = vehicle.model || '';
      const year = vehicle.year ? String(vehicle.year) : '';
      const description = vehicle.vehicle || '';
      const matchesSearch = searchTerm === '' ||
        vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.toLowerCase().includes(searchTerm.toLowerCase()) ||
        make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        year.includes(searchTerm) ||
        description.toLowerCase().includes(searchTerm.toLowerCase());

  const normalizedVehicleStatus = (vehicle.status || '').toLowerCase().replace(/\s+/g, '-');
  const matchesStatus = statusFilter === 'all' || normalizedVehicleStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort vehicles
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
        const aTime = aVal ? new Date(aVal).getTime() : 0;
        const bTime = bVal ? new Date(bVal).getTime() : 0;
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }

      if (sortBy === 'year') {
        aVal = parseInt(aVal, 10) || 0;
        bVal = parseInt(bVal, 10) || 0;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
      }
      if (typeof bVal === 'string') {
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [vehicles, searchTerm, statusFilter, sortBy, sortOrder]);

  // Get status color
  const getStatusColor = (status) => {
    const normalized = (status || '').toLowerCase().replace(/\s+/g, '-');
    switch (normalized) {
      case 'available': return 'bg-green-500';
      case 'in-service': return 'bg-yellow-500';
      case 'maintenance': return 'bg-red-500';
      case 'sold': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F172A', color: '#F1F5F9' }}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-800 p-6 rounded-lg">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F172A', color: '#F1F5F9' }}>
        <div className="p-6">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-200">Inventory Load Error</h3>
            </div>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A', color: '#F1F5F9' }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Vehicle Inventory</h1>
          <p className="text-gray-300">Manage and track your vehicle inventory</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Vehicles
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by VIN, stock #, make, model..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="in-service">In Service</option>
                <option value="maintenance">Maintenance</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="updatedAt-desc">Recently Updated</option>
                <option value="year-desc">Year (Newest)</option>
                <option value="year-asc">Year (Oldest)</option>
                <option value="make-asc">Make (A-Z)</option>
                <option value="make-desc">Make (Z-A)</option>
                <option value="stockNumber-asc">Stock Number</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <span className="text-gray-300">
              Showing {filteredAndSortedVehicles.length} of {vehicles.length} vehicles
            </span>
          </div>
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedVehicles.map((vehicle) => {
            const vehicleTitle = [vehicle.year, vehicle.make, vehicle.model]
              .filter(Boolean)
              .join(' ') || vehicle.vehicle || 'Vehicle';
            const subtitleParts = [vehicle.trim, vehicle.color].filter(Boolean);
            const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : '';
            const stockNumber = vehicle.stockNumber || 'N/A';
            const vin = vehicle.vin || 'Unknown';

            return (
            <div
              key={vehicle.id || vehicle._id || vehicle.vin || vehicle.stockNumber}
              onClick={() => setSelectedVehicle(vehicle)}
              className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-lg"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(vehicle.status)}`}>
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  {vehicle.status || 'Unknown'}
                </div>
                <span className="text-gray-400 text-sm">#{stockNumber}</span>
              </div>

              {/* Vehicle Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {vehicleTitle}
                </h3>
                {subtitle && (
                  <p className="text-gray-400 text-sm mb-2">{subtitle}</p>
                )}
                <p className="text-gray-500 text-xs font-mono">{vin}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm transition-colors"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedVehicle(vehicle);
                  }}
                >
                  View Details
                </button>
                <button
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm transition-colors"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedVehicle(vehicle);
                  }}
                  aria-label="More vehicle actions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAndSortedVehicles.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-24 h-24 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No vehicles found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first vehicle'
              }
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <p className="text-gray-500">Inventory data sync controls are available from the Vehicles settings page.</p>
            )}
          </div>
        )}
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </h2>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">VIN</label>
                  <p className="text-white font-mono">{selectedVehicle.vin}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Stock Number</label>
                  <p className="text-white">{selectedVehicle.stockNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Color</label>
                  <p className="text-white">{selectedVehicle.color}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(selectedVehicle.status)}`}>
                    {selectedVehicle.status || 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                  Create Job
                </button>
                <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Edit Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseInventory;