/**
 * Enterprise Job Manager
 * Advanced job creation, tracking, and management with modern UI
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
  ProgressBar,
  EmptyState,
  Spinner,
} from '../components/ui/EnterpriseComponents';
import { useNotification } from '../components/ui/NotificationSystem';
import { V2 } from '../utils/v2Client';

export const EnterpriseJobManager = ({ user }) => {
  const { addNotification } = useNotification();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const [formData, setFormData] = useState({
    technicianName: user?.name || '',
    vin: '',
    vehicleDescription: '',
    serviceType: 'Cleanup',
    priority: 'Normal',
    salesPerson: '',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await V2.get('/jobs');
      setJobs(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load jobs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const response = await V2.post('/jobs', {
        ...formData,
        technicianId: user?.id,
      });
      setJobs((prev) => [response.data, ...(prev || [])]);
      setIsModalOpen(false);
      addNotification({
        type: 'success',
        title: 'Job Created',
        message: `Job "${formData.vehicleDescription}" created successfully`,
        duration: 5000,
      });
      setFormData({
        technicianName: user?.name || '',
        vin: '',
        vehicleDescription: '',
        serviceType: 'Cleanup',
        priority: 'Normal',
        salesPerson: '',
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: 'Failed to create job. Please try again.',
        duration: 5000,
      });
      setError('Failed to create job');
    }
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      const response = await V2.put(`/jobs/${jobId}/status`, {
        status: newStatus,
      });
      setJobs((prev) => prev.map((j) => (j.id === jobId ? response.data : j)));
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Job status changed to "${newStatus}"`,
        duration: 5000,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update job status. Please try again.',
        duration: 5000,
      });
      setError('Failed to update job status');
    }
  };

  const getFilteredJobs = () => {
    return jobs.filter((job) => {
      if (filter === 'all') return true;
      return job.status === filter;
    });
  };

  const statusColors = {
    'Pending': 'gray',
    'In Progress': 'blue',
    'Paused': 'warning',
    'Completed': 'success',
    'QC Required': 'warning',
    'QC Approved': 'success',
    'Cancelled': 'danger',
  };

  // ========================================================================
  // JOB CARD
  // ========================================================================

  const JobCard = ({ job }) => (
    <Card hoverable className="cursor-pointer" onClick={() => setSelectedJob(job)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{job.vehicleDescription || 'Unknown Vehicle'}</h3>
            <p className="text-sm text-gray-600">VIN: {job.vin}</p>
          </div>
          <Badge variant={statusColors[job.status]} size="lg">
            {job.status}
          </Badge>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Service Type</p>
            <p className="font-medium">{job.serviceType}</p>
          </div>
          <div>
            <p className="text-gray-600">Priority</p>
            <p className="font-medium capitalize">{job.priority}</p>
          </div>
          <div>
            <p className="text-gray-600">Technician</p>
            <p className="font-medium">{job.technicianName}</p>
          </div>
          <div>
            <p className="text-gray-600">Duration</p>
            <p className="font-medium">{job.duration || 0}m</p>
          </div>
        </div>

        {/* Progress */}
        {job.status === 'In Progress' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{Math.min(job.duration || 0, job.expectedDuration || 60)} / {job.expectedDuration || 60}m</span>
            </div>
            <ProgressBar
              value={Math.min(job.duration || 0, job.expectedDuration || 60)}
              max={job.expectedDuration || 60}
              variant="primary"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          {job.status === 'Pending' && (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateJobStatus(job.id, 'In Progress');
              }}
            >
              Start
            </Button>
          )}
          {job.status === 'In Progress' && (
            <>
              <Button
                variant="warning"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateJobStatus(job.id, 'Paused');
                }}
              >
                Pause
              </Button>
              <Button
                variant="success"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateJobStatus(job.id, 'Completed');
                }}
              >
                Complete
              </Button>
            </>
          )}
          {job.status === 'Paused' && (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateJobStatus(job.id, 'In Progress');
              }}
            >
              Resume
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  // ========================================================================
  // JOB CREATION FORM
  // ========================================================================

  const CreateJobForm = () => (
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="Create New Job"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateJob}>
            Create Job
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Vehicle Description"
          placeholder="e.g., 2023 Toyota Camry - Silver"
          value={formData.vehicleDescription}
          onChange={(e) => setFormData({ ...formData, vehicleDescription: e.target.value })}
          required
        />

        <Input
          label="VIN (Vehicle Identification Number)"
          placeholder="17-character VIN"
          value={formData.vin}
          onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
          maxLength="17"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Service Type"
            value={formData.serviceType}
            onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
            options={[
              { value: 'Cleanup', label: 'Cleanup' },
              { value: 'Detail', label: 'Detail' },
              { value: 'Delivery', label: 'Delivery' },
              { value: 'Rewash', label: 'Rewash' },
              { value: 'Lot Car', label: 'Lot Car' },
              { value: 'FCTP', label: 'FCTP' },
              { value: 'Touch-up', label: 'Touch-up' },
            ]}
          />

          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            options={[
              { value: 'Low', label: 'Low' },
              { value: 'Normal', label: 'Normal' },
              { value: 'High', label: 'High' },
              { value: 'Urgent', label: 'Urgent' },
            ]}
          />
        </div>

        <Input
          label="Sales Person (Optional)"
          placeholder="Name of sales representative"
          value={formData.salesPerson}
          onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
        />

        <Input
          label="Technician Name"
          disabled
          value={formData.technicianName}
        />
      </form>
    </Modal>
  );

  // ========================================================================
  // JOB DETAIL MODAL
  // ========================================================================

  const JobDetailModal = () => (
    <Modal
      isOpen={!!selectedJob}
      onClose={() => setSelectedJob(null)}
      title={selectedJob?.vehicleDescription || 'Job Details'}
      size="xl"
    >
      {selectedJob && (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-2 gap-4">
            <Card variant="flat">
              <p className="text-gray-600 text-sm">Current Status</p>
              <Badge variant={statusColors[selectedJob.status]} className="mt-2">
                {selectedJob.status}
              </Badge>
            </Card>
            <Card variant="flat">
              <p className="text-gray-600 text-sm">Duration</p>
              <p className="text-2xl font-bold mt-2">{selectedJob.duration || 0}m</p>
            </Card>
          </div>

          {/* Job Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">VIN</p>
                <p className="font-medium">{selectedJob.vin}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Service Type</p>
                <p className="font-medium">{selectedJob.serviceType}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Priority</p>
                <p className="font-medium capitalize">{selectedJob.priority}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Technician</p>
                <p className="font-medium">{selectedJob.technicianName}</p>
              </div>
            </div>
          </div>

          {/* Progress if in progress */}
          {selectedJob.status === 'In Progress' && (
            <div>
              <p className="text-sm font-medium mb-2">Job Progress</p>
              <ProgressBar
                value={Math.min(selectedJob.duration || 0, selectedJob.expectedDuration || 60)}
                max={selectedJob.expectedDuration || 60}
                variant="primary"
                showLabel
              />
            </div>
          )}

          {/* QC Notes if applicable */}
          {selectedJob.qcNotes && (
            <Alert variant="info" title="QC Notes">
              {selectedJob.qcNotes}
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredJobs = getFilteredJobs();

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="danger" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          ➕ New Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'Pending', 'In Progress', 'Completed'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {filteredJobs.length > 0 && filter === status && (
              <span className="ml-2 bg-white text-sky-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {filteredJobs.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length > 0 ? (
        <Grid cols={2} gap={6}>
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon="📭"
          title="No jobs found"
          description={
            filter === 'all'
              ? 'Create your first job to get started'
              : `No jobs with status "${filter}"`
          }
          action={
            filter === 'all' && (
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Create First Job
              </Button>
            )
          }
        />
      )}

      {/* Modals */}
      <CreateJobForm />
      <JobDetailModal />
    </div>
  );
};

export default EnterpriseJobManager;
