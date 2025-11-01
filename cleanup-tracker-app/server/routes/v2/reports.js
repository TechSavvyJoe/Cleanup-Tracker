
const express = require('express');
const router = express.Router();
const Job = require('../../models/Job');

// Reports endpoint with proper time calculations
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = startDate;
      if (endDate) dateFilter.date.$lte = endDate;
    }
    
    // Get all jobs for the period
    const allJobs = await Job.find(dateFilter).sort({ startTime: -1 });
    const completedJobs = allJobs.filter(job => job.status === 'Completed' && job.duration > 0);
    
    // Calculate period totals
    const periodTotal = allJobs.length;
    const completed = completedJobs.length;
    const completionRate = periodTotal > 0 ? Math.round((completed / periodTotal) * 100) : 0;
    
    // Calculate last 7 days (for comparison)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await Job.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Calculate detailer performance
    const detailerStats = {};
    const serviceTypeStats = {};
    
    completedJobs.forEach(job => {
      // Detailer performance
      const techName = job.technicianName || 'Unknown';
      if (!detailerStats[techName]) {
        detailerStats[techName] = {
          name: techName,
          totalJobs: 0,
          totalTime: 0,
          minTime: Infinity,
          maxTime: 0,
          recentJobs: 0
        };
      }
      
      detailerStats[techName].totalJobs++;
      detailerStats[techName].totalTime += job.duration || 0;
      detailerStats[techName].minTime = Math.min(detailerStats[techName].minTime, job.duration || 0);
      detailerStats[techName].maxTime = Math.max(detailerStats[techName].maxTime, job.duration || 0);
      
      // Count recent jobs (last 7 days)
      const jobDate = new Date(job.createdAt || job.startTime);
      if (jobDate >= sevenDaysAgo) {
        detailerStats[techName].recentJobs++;
      }
      
      // Service type performance
      const serviceType = job.serviceType || 'Unknown';
      if (!serviceTypeStats[serviceType]) {
        serviceTypeStats[serviceType] = {
          jobs: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }
      
      serviceTypeStats[serviceType].jobs++;
      serviceTypeStats[serviceType].totalTime += job.duration || 0;
      serviceTypeStats[serviceType].minTime = Math.min(serviceTypeStats[serviceType].minTime, job.duration || 0);
      serviceTypeStats[serviceType].maxTime = Math.max(serviceTypeStats[serviceType].maxTime, job.duration || 0);
    });
    
    // Format detailer performance with proper averages
    const detailerPerformance = Object.values(detailerStats).map(stat => ({
      name: stat.name,
      totalJobs: stat.totalJobs,
      avgTime: stat.totalJobs > 0 ? Math.round(stat.totalTime / stat.totalJobs) : 0,
      minTime: stat.minTime === Infinity ? 0 : stat.minTime,
      maxTime: stat.maxTime,
      recentJobs: stat.recentJobs
    }));
    
    // Format service type performance
    const serviceTypes = Object.entries(serviceTypeStats).map(([type, stat]) => ({
      name: type,
      jobs: stat.jobs,
      avgTime: stat.jobs > 0 ? Math.round(stat.totalTime / stat.jobs) : 0,
      minTime: stat.minTime === Infinity ? 0 : stat.minTime,
      maxTime: stat.maxTime
    }));
    
    // Calculate daily trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentJobs = await Job.find({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const dailyTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayJobs = recentJobs.filter(job => {
        const jobDate = new Date(job.createdAt || job.startTime);
        return jobDate.toISOString().split('T')[0] === dateStr;
      });
      
      const dayCompleted = dayJobs.filter(job => job.status === 'Completed');
      const completionPct = dayJobs.length > 0 ? Math.round((dayCompleted.length / dayJobs.length) * 100) : 0;
      
      dailyTrends.push({
        date: dateStr,
        jobs: dayJobs.length,
        completed: dayCompleted.length,
        completionRate: completionPct
      });
    }
    
    res.json({
      periodTotal,
      completed,
      completionRate,
      last7Days,
      detailerPerformance,
      serviceTypes,
      dailyTrends
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
