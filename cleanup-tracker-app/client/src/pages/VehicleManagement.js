/**
 * Vehicle Management Page
 * Full CRUD operations for vehicles with modern UI
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Alert,
  Spinner,
  EmptyState,
  Tabs,
} from '../components/ui/EnterpriseComponents';
import { useNotification } from '../components/ui/NotificationSystem';
import { V2 } from '../utils/v2Client';

export const VehicleManagement = ({ user }) => {
  const { addNotification } = useNotification();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    vin: '',
    year: '',
    make: '',
    model: '',
    color: '',
    stockNumber: '',
    status: 'In Stock',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await V2.get('/vehicles');
      setVehicles(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load vehicles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      const response = await V2.post('/vehicles', formData);
      setVehicles([response.data, ...vehicles]);
      setIsModalOpen(false);
      addNotification({
        type: 'success',
        title: 'Vehicle Added',
        message: `${formData.year} ${formData.make} ${formData.model} added successfully`,
        duration: 5000,
      });
      resetForm();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Failed to Add Vehicle',
        message: err.response?.data?.error || 'Please try again',
        duration: 5000,
      });
      setError('Failed to create vehicle');
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    try {
      const response = await V2.put(`/vehicles/${selectedVehicle.id}`, formData);
      setVehicles(vehicles.map((v) => (v.id === selectedVehicle.id ? response.data : v)));
      setIsModalOpen(false);
      setEditMode(false);
      addNotification({
        type: 'success',
        title: 'Vehicle Updated',
        message: 'Vehicle information updated successfully',
        duration: 5000,
      });
      resetForm();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update vehicle',
        duration: 5000,
      });
      setError('Failed to update vehicle');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await V2.delete(`/vehicles/${vehicleId}`);
        setVehicles(vehicles.filter((v) => v.id !== vehicleId));
        addNotification({
          type: 'warning',
          title: 'Vehicle Deleted',
          message: 'Vehicle removed from inventory',
          duration: 5000,
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: 'Deletion Failed',
          message: 'Failed to delete vehicle',
          duration: 5000,
        });
        setError('Failed to delete vehicle');
      }
    }
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      vin: vehicle.vin || '',
      year: vehicle.year || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      stockNumber: vehicle.stockNumber || '',
      status: vehicle.status || 'In Stock',
    });
    setEditMode(true);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setEditMode(false);
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vin: '',
      year: '',
      make: '',
      model: '',
      color: '',
      stockNumber: '',
      status: 'In Stock',
    });
  };

  const getFilteredVehicles = () => {
    let filtered = vehicles;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((v) => v.status === filter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.year?.toString().includes(searchTerm) ||
          v.stockNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const statusColors = {
    'In Stock': 'success',
    'In Service': 'blue',
    'Sold': 'gray',
    'On Hold': 'warning',
  };

  // Vehicle Card Component
  const VehicleCard = ({ vehicle }) => (
    <Card hoverable className="cursor-pointer" onClick={() => openEditModal(vehicle)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-gray-600">VIN: {vehicle.vin}</p>
          </div>
          <Badge variant={statusColors[vehicle.status] || 'gray'} size="lg">
            {vehicle.status}
          </Badge>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Color</p>
            <p className="font-medium">{vehicle.color || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Stock #</p>
            <p className="font-medium">{vehicle.stockNumber || 'N/A'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(vehicle);
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteVehicle(vehicle.id);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );

  // Vehicle Form Modal
  const VehicleFormModal = () => (
    <Modal
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setEditMode(false);
        resetForm();
      }}
      title={editMode ? 'Edit Vehicle' : 'Add New Vehicle'}
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setIsModalOpen(false);
              setEditMode(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={editMode ? handleUpdateVehicle : handleCreateVehicle}
          >
            {editMode ? 'Update Vehicle' : 'Add Vehicle'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="VIN (Vehicle Identification Number)"
          placeholder="17-character VIN"
          value={formData.vin}
          onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
          maxLength="17"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Year"
            type="number"
            placeholder="2024"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            required
          />

          <Input
            label="Make"
            placeholder="Toyota, Honda, etc."
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            required
          />
        </div>

        <Input
          label="Model"
          placeholder="Camry, Accord, etc."
          value={formData.model}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Color"
            placeholder="Silver, Black, etc."
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />

          <Input
            label="Stock Number"
            placeholder="STK12345"
            value={formData.stockNumber}
            onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value.toUpperCase() })}
          />
        </div>

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: 'In Stock', label: 'In Stock' },
            { value: 'In Service', label: 'In Service' },
            { value: 'Sold', label: 'Sold' },
            { value: 'On Hold', label: 'On Hold' },
          ]}
        />
      </form>
    </Modal>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredVehicles = getFilteredVehicles();

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="danger" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vehicle Inventory</h2>
          <p className="text-gray-600 mt-1">{vehicles.length} total vehicles</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          ➕ Add Vehicle
        </Button>
      </div>

      {/* Search Bar */}
      <Input
        placeholder="Search by VIN, Make, Model, Year, or Stock Number..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'In Stock', 'In Service', 'Sold', 'On Hold'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {filter === status && filteredVehicles.length > 0 && (
              <span className="ml-2 bg-white text-sky-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {filteredVehicles.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length > 0 ? (
        <Grid cols={3} gap={6}>
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id || vehicle._id} vehicle={vehicle} />
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon="🚗"
          title="No vehicles found"
          description={
            filter === 'all' && !searchTerm
              ? 'Add your first vehicle to get started'
              : 'No vehicles match your search criteria'
          }
          action={
            filter === 'all' && !searchTerm && (
              <Button variant="primary" onClick={openCreateModal}>
                Add First Vehicle
              </Button>
            )
          }
        />
      )}

      {/* Modal */}
      <VehicleFormModal />
    </div>
  );
};

export default VehicleManagement;
