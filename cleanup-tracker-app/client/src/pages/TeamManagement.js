/**
 * Team Management (Technicians) Page
 * Full user/technician management with performance tracking
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
} from '../components/ui/EnterpriseComponents';
import { useNotification } from '../components/ui/NotificationSystem';
import { V2 } from '../utils/v2Client';

export const TeamManagement = ({ user }) => {
  const { addNotification } = useNotification();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'detailer',
    employeeNumber: '',
    phoneNumber: '',
    email: '',
  });

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await V2.get('/users');
      setTeam(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      const response = await V2.post('/users', formData);
      setTeam([...team, response.data]);
      setIsModalOpen(false);
      addNotification({
        type: 'success',
        title: 'Team Member Added',
        message: `${formData.name} (${formData.role.toUpperCase()}) added successfully`,
        duration: 5000,
      });
      resetForm();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Failed to Add Member',
        message: err.response?.data?.error || 'Please try again',
        duration: 5000,
      });
      setError('Failed to create team member');
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    try {
      const response = await V2.put(`/users/${selectedMember.id}`, formData);
      setTeam(team.map((m) => (m.id === selectedMember.id ? response.data : m)));
      setIsModalOpen(false);
      setEditMode(false);
      addNotification({
        type: 'success',
        title: 'Member Updated',
        message: 'Team member information updated successfully',
        duration: 5000,
      });
      resetForm();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update team member',
        duration: 5000,
      });
      setError('Failed to update team member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      try {
        await V2.delete(`/users/${memberId}`);
        setTeam(team.filter((m) => m.id !== memberId));
        addNotification({
          type: 'warning',
          title: 'Team Member Removed',
          message: 'Team member has been removed',
          duration: 5000,
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: 'Deletion Failed',
          message: 'Failed to remove team member',
          duration: 5000,
        });
        setError('Failed to delete team member');
      }
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name || '',
      pin: member.pin || '',
      role: member.role || 'detailer',
      employeeNumber: member.employeeNumber || '',
      phoneNumber: member.phoneNumber || '',
      email: member.email || '',
    });
    setEditMode(true);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setEditMode(false);
    setSelectedMember(null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      pin: '',
      role: 'detailer',
      employeeNumber: '',
      phoneNumber: '',
      email: '',
    });
  };

  const getFilteredTeam = () => {
    let filtered = team;

    // Filter by role
    if (filter !== 'all') {
      filtered = filtered.filter((m) => m.role === filter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.phoneNumber?.includes(searchTerm) ||
          m.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const roleColors = {
    manager: 'blue',
    detailer: 'success',
    technician: 'warning',
    salesperson: 'gray',
  };

  const roleLabels = {
    manager: 'Manager',
    detailer: 'Detailer',
    technician: 'Technician',
    salesperson: 'Sales',
  };

  // Team Member Card
  const MemberCard = ({ member }) => (
    <Card hoverable className="cursor-pointer" onClick={() => openEditModal(member)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
            <p className="text-sm text-gray-600">PIN: {member.pin}</p>
          </div>
          <Badge variant={roleColors[member.role] || 'gray'} size="lg">
            {roleLabels[member.role] || member.role}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">🆔</span>
            <span className="font-medium">{member.employeeNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">📱</span>
            <span className="font-medium">{member.phoneNumber || 'N/A'}</span>
          </div>
          {member.email && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">📧</span>
              <span className="font-medium">{member.email}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(member);
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
              handleDeleteMember(member.id);
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    </Card>
  );

  // Team Member Form Modal
  const MemberFormModal = () => (
    <Modal
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setEditMode(false);
        resetForm();
      }}
      title={editMode ? 'Edit Team Member' : 'Add Team Member'}
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
            onClick={editMode ? handleUpdateMember : handleCreateMember}
          >
            {editMode ? 'Update Member' : 'Add Member'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Full Name"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="PIN (4-8 digits)"
            type="password"
            placeholder="****"
            value={formData.pin}
            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
            maxLength="8"
            required
          />

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'manager', label: 'Manager' },
              { value: 'detailer', label: 'Detailer' },
              { value: 'technician', label: 'Technician' },
              { value: 'salesperson', label: 'Salesperson' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Employee Number"
            placeholder="EMP001"
            value={formData.employeeNumber}
            onChange={(e) =>
              setFormData({ ...formData, employeeNumber: e.target.value.toUpperCase() })
            }
          />

          <Input
            label="Phone Number"
            placeholder="555-0123"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          />
        </div>

        <Input
          label="Email (Optional)"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

  const filteredTeam = getFilteredTeam();

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
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-gray-600 mt-1">{team.length} team members</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          ➕ Add Team Member
        </Button>
      </div>

      {/* Search Bar */}
      <Input
        placeholder="Search by name, employee number, phone, or email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Role Filters */}
      <div className="flex gap-2">
        {['all', 'manager', 'detailer', 'technician', 'salesperson'].map((role) => (
          <Button
            key={role}
            variant={filter === role ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(role)}
          >
            {role === 'all' ? 'All' : roleLabels[role]}
            {filter === role && filteredTeam.length > 0 && (
              <span className="ml-2 bg-white text-sky-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {filteredTeam.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Team Grid */}
      {filteredTeam.length > 0 ? (
        <Grid cols={3} gap={6}>
          {filteredTeam.map((member) => (
            <MemberCard key={member.id || member._id} member={member} />
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon="👥"
          title="No team members found"
          description={
            filter === 'all' && !searchTerm
              ? 'Add your first team member to get started'
              : 'No team members match your search criteria'
          }
          action={
            filter === 'all' && !searchTerm && (
              <Button variant="primary" onClick={openCreateModal}>
                Add First Team Member
              </Button>
            )
          }
        />
      )}

      {/* Modal */}
      <MemberFormModal />
    </div>
  );
};

export default TeamManagement;
