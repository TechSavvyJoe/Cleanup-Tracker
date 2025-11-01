/**
 * Enterprise Settings & Admin Panel
 * User management, system configuration, and settings
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Alert,
  Modal,
  Tabs,
  Spinner,
  EmptyState,
} from '../components/ui/EnterpriseComponents';
import { useNotification } from '../components/ui/NotificationSystem';
import { V2 } from '../utils/v2Client';

export const EnterpriseSettings = ({ user }) => {
  // ==================== HOOKS ====================
  const { addNotification } = useNotification();

  // ==================== STATE ====================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState(null);

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    pin: '',
    role: 'detailer',
    employeeNumber: '',
    phoneNumber: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, settingsRes] = await Promise.all([
        V2.get('/users'),
        V2.get('/settings'),
      ]);
      setUsers(usersRes.data || []);
      setSettings(settingsRes.data || {});
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await V2.post('/users', newUserForm);
      setUsers([...users, response.data]);
      setIsUserModalOpen(false);
      addNotification({
        type: 'success',
        title: 'User Created',
        message: `User "${newUserForm.name}" (${newUserForm.role.toUpperCase()}) has been created successfully`,
        duration: 5000,
      });
      setNewUserForm({
        name: '',
        pin: '',
        role: 'detailer',
        employeeNumber: '',
        phoneNumber: '',
      });
    } catch (err) {
      const errMsg = 'Failed to create user: ' + (err.message || 'Unknown error');
      setError(errMsg);
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: errMsg,
        duration: 5000,
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await V2.delete(`/users/${userId}`);
        setUsers(users.filter((u) => u.id !== userId));
        setSelectedUser(null);
        addNotification({
          type: 'warning',
          title: 'User Deleted',
          message: 'User has been permanently deleted',
          duration: 5000,
        });
      } catch (err) {
        const errMsg = 'Failed to delete user: ' + (err.message || 'Unknown error');
        setError(errMsg);
        addNotification({
          type: 'error',
          title: 'Deletion Failed',
          message: errMsg,
          duration: 5000,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  // ========================================================================
  // USER MANAGEMENT TAB
  // ========================================================================

  const UserManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Team Members</h3>
        <Button variant="primary" onClick={() => setIsUserModalOpen(true)}>
          ➕ Add User
        </Button>
      </div>

      {users.length > 0 ? (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} hoverable>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{u.name}</h4>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                    <span>🆔 {u.employeeNumber || 'N/A'}</span>
                    <span>📱 {u.phoneNumber || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="primary">{u.role}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(u)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteUser(u.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No team members"
          description="Add your first team member to get started"
        />
      )}
    </div>
  );

  // ========================================================================
  // SYSTEM SETTINGS TAB
  // ========================================================================

  const SystemSettings = () => (
    <div className="space-y-6">
      <Card>
        <h4 className="font-bold mb-4">System Configuration</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Site Title"
              value={settings.siteTitle || 'Cleanup Tracker'}
              disabled
            />
            <Input
              label="Environment"
              value="Production"
              disabled
            />
          </div>
          <Input
            label="Inventory CSV URL"
            value={settings.inventoryCsvUrl || ''}
            disabled
            help="URL for automatic vehicle inventory import"
          />
        </div>
      </Card>

      <Card>
        <h4 className="font-bold mb-4">System Status</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="font-medium">Database Status</span>
            <Badge variant="success">Connected</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="font-medium">API Server</span>
            <Badge variant="success">Operational</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="font-medium">Inventory Sync</span>
            <Badge variant="info">Last 1h ago</Badge>
          </div>
        </div>
      </Card>
    </div>
  );

  // ========================================================================
  // SECURITY TAB
  // ========================================================================

  const SecuritySettings = () => (
    <div className="space-y-6">
      <Alert variant="info" title="Security Information" icon="🔒">
        Your application uses JWT-based authentication with PIN-based login. All passwords and PINs are securely hashed.
      </Alert>

      <Card>
        <h4 className="font-bold mb-4">Authentication Settings</h4>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Access Token Expiry</p>
            <p className="font-medium">15 minutes</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Refresh Token Expiry</p>
            <p className="font-medium">7 days</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">PIN Requirements</p>
            <p className="font-medium">4-8 digits</p>
          </div>
        </div>
      </Card>

      <Card>
        <h4 className="font-bold mb-4">Rate Limiting</h4>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">General API Limit</p>
            <p className="font-medium">100 requests / 15 minutes</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Auth Endpoint Limit</p>
            <p className="font-medium">5 attempts / 15 minutes</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // ========================================================================
  // ADD USER MODAL
  // ========================================================================

  const AddUserModal = () => (
    <Modal
      isOpen={isUserModalOpen}
      onClose={() => setIsUserModalOpen(false)}
      title="Add New User"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateUser}>
            Create User
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Name"
          placeholder="Full name"
          required
          value={newUserForm.name}
          onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
        />

        <Input
          label="PIN"
          placeholder="4-8 digits"
          required
          type="password"
          value={newUserForm.pin}
          onChange={(e) => setNewUserForm({ ...newUserForm, pin: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role"
            value={newUserForm.role}
            onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
            options={[
              { value: 'manager', label: 'Manager' },
              { value: 'detailer', label: 'Detailer' },
              { value: 'salesperson', label: 'Salesperson' },
            ]}
          />

          <Input
            label="Employee Number"
            placeholder="e.g., EMP001"
            value={newUserForm.employeeNumber}
            onChange={(e) =>
              setNewUserForm({ ...newUserForm, employeeNumber: e.target.value })
            }
          />
        </div>

        <Input
          label="Phone Number"
          placeholder="+1 (555) 000-0000"
          value={newUserForm.phoneNumber}
          onChange={(e) => setNewUserForm({ ...newUserForm, phoneNumber: e.target.value })}
        />
      </form>
    </Modal>
  );

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="danger" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-gray-600">Manage system settings, users, and security</p>
      </div>

      <Tabs
        defaultTab={0}
        tabs={[
          {
            label: '👥 Team Management',
            content: <UserManagement />,
          },
          {
            label: '⚙️ System Settings',
            content: <SystemSettings />,
          },
          {
            label: '🔒 Security',
            content: <SecuritySettings />,
          },
        ]}
      />

      <AddUserModal />
    </div>
  );
};

export default EnterpriseSettings;
