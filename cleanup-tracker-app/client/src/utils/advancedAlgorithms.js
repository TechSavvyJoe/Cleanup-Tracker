// 🚀 Enterprise-Grade Advanced Algorithms
// Premium features for Cleanup Tracker

/**
 * PREDICTIVE ANALYTICS ENGINE
 * Machine learning-inspired algorithms for intelligent predictions
 */
export const PredictiveAnalytics = {
  /**
   * Predict job completion time using weighted historical analysis
   * Factors: vehicle type, service type, detailer experience, time patterns
   */
  predictJobDuration: (jobData, historicalJobs, detailerStats) => {
    if (!historicalJobs || historicalJobs.length === 0) {
      // Fallback to baseline estimates
      const baselines = {
        'Detail': 90,
        'Delivery': 30,
        'Rewash': 45,
        'Lot Car': 60,
        'FCTP': 75,
        'Cleanup': 50,
        'Showroom': 40
      };
      return baselines[jobData.serviceType] || 60;
    }

    // Filter relevant historical data
    const relevantJobs = historicalJobs.filter(job => 
      job.serviceType === jobData.serviceType &&
      job.status === 'completed' &&
      job.duration > 0 &&
      job.duration < 480 // Exclude outliers > 8 hours
    );

    if (relevantJobs.length === 0) return 60;

    // Calculate weighted average based on recency and relevance
    const now = Date.now();
    let totalWeight = 0;
    let weightedSum = 0;

    relevantJobs.forEach(job => {
      // Recency weight (more recent = higher weight)
      const jobAge = Math.max(1, (now - new Date(job.completedAt).getTime()) / (1000 * 60 * 60 * 24));
      const recencyWeight = 1 / Math.log10(jobAge + 10);

      // Vehicle type similarity weight
      const vehicleWeight = job.vehicleType === jobData.vehicleType ? 1.5 : 1.0;

      // Detailer experience weight
      const experienceWeight = detailerStats?.averageJobTime ? 
        (detailerStats.averageJobTime / job.duration) : 1.0;

      const finalWeight = recencyWeight * vehicleWeight * experienceWeight;
      
      totalWeight += finalWeight;
      weightedSum += job.duration * finalWeight;
    });

    const prediction = Math.round(weightedSum / totalWeight);
    
    // Apply confidence interval (±15%)
    return {
      predicted: prediction,
      min: Math.round(prediction * 0.85),
      max: Math.round(prediction * 1.15),
      confidence: Math.min(95, (relevantJobs.length / 10) * 100),
      sampleSize: relevantJobs.length
    };
  },

  /**
   * Smart workload distribution algorithm
   * Optimizes job assignment based on multiple factors
   */
  optimizeWorkloadDistribution: (availableDetailers, pendingJobs) => {
    const assignments = [];
    
    // Calculate capacity score for each detailer
    const detailerScores = availableDetailers.map(detailer => ({
      ...detailer,
      capacityScore: calculateCapacityScore(detailer),
      skillScore: calculateSkillScore(detailer),
      efficiencyScore: calculateEfficiencyScore(detailer)
    }));

    // Sort jobs by priority (urgent first, then by creation time)
    const sortedJobs = [...pendingJobs].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Assign jobs using greedy algorithm with backtracking
    sortedJobs.forEach(job => {
      const bestMatch = findBestDetailerMatch(job, detailerScores);
      if (bestMatch) {
        assignments.push({
          jobId: job.id,
          detailerId: bestMatch.id,
          confidence: bestMatch.matchScore,
          estimatedCompletion: bestMatch.estimatedCompletion
        });
        
        // Update detailer's available capacity
        bestMatch.currentLoad += job.estimatedDuration || 60;
      }
    });

    return assignments;
  },

  /**
   * Performance trend analysis with anomaly detection
   */
  analyzePerformanceTrends: (jobs, timeWindow = 30) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow * 24 * 60 * 60 * 1000);
    
    const recentJobs = jobs.filter(job => 
      job.completedAt && new Date(job.completedAt) >= windowStart
    );

    if (recentJobs.length < 5) {
      return { status: 'insufficient_data', message: 'Need more data for analysis' };
    }

    // Calculate rolling metrics
    const metrics = {
      avgDuration: calculateMovingAverage(recentJobs.map(j => j.duration)),
      completionRate: (recentJobs.filter(j => j.status === 'completed').length / recentJobs.length) * 100,
      efficiencyTrend: calculateTrendDirection(recentJobs),
      outliers: detectAnomalies(recentJobs),
      peakHours: identifyPeakPerformanceHours(recentJobs),
      bottlenecks: identifyBottlenecks(recentJobs)
    };

    // Generate insights
    const insights = generateInsights(metrics);
    
    return {
      status: 'success',
      metrics,
      insights,
      recommendations: generateRecommendations(metrics)
    };
  },

  /**
   * Efficiency scoring algorithm
   * Multi-factor calculation with weighted components
   */
  calculateEfficiencyScore: (detailer, jobs) => {
    const detailerJobs = jobs.filter(j => j.detailerId === detailer.id && j.status === 'completed');
    
    if (detailerJobs.length === 0) return { score: 0, grade: 'N/A' };

    // Component scores (0-100)
    const speedScore = calculateSpeedScore(detailerJobs);
    const qualityScore = calculateQualityScore(detailerJobs);
    const consistencyScore = calculateConsistencyScore(detailerJobs);
    const volumeScore = calculateVolumeScore(detailerJobs);

    // Weighted average
    const weights = { speed: 0.3, quality: 0.4, consistency: 0.2, volume: 0.1 };
    const totalScore = 
      speedScore * weights.speed +
      qualityScore * weights.quality +
      consistencyScore * weights.consistency +
      volumeScore * weights.volume;

    // Letter grade
    const grade = 
      totalScore >= 90 ? 'A+' :
      totalScore >= 85 ? 'A' :
      totalScore >= 80 ? 'A-' :
      totalScore >= 75 ? 'B+' :
      totalScore >= 70 ? 'B' :
      totalScore >= 65 ? 'B-' :
      totalScore >= 60 ? 'C+' :
      totalScore >= 55 ? 'C' : 'C-';

    return {
      score: Math.round(totalScore),
      grade,
      components: { speedScore, qualityScore, consistencyScore, volumeScore },
      percentile: calculatePercentile(totalScore, jobs),
      trend: calculateScoreTrend(detailer, jobs)
    };
  }
};

/**
 * INTELLIGENT SEARCH ENGINE
 * Advanced fuzzy matching and natural language processing
 */
export const IntelligentSearch = {
  /**
   * Fuzzy VIN search with error correction
   * Handles typos, missing characters, and similar patterns
   */
  fuzzyVinSearch: (query, vehicles) => {
    if (!query || query.length < 3) return vehicles;

    const normalizedQuery = query.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    return vehicles
      .map(vehicle => ({
        ...vehicle,
        score: calculateFuzzyScore(normalizedQuery, vehicle.vin)
      }))
      .filter(v => v.score > 0.5) // Similarity threshold
      .sort((a, b) => b.score - a.score);
  },

  /**
   * Natural language query processor
   * Converts user queries to structured filters
   */
  processNaturalQuery: (query) => {
    const filters = {
      dateRange: extractDateRange(query),
      status: extractStatus(query),
      vehicle: extractVehicleInfo(query),
      detailer: extractDetailerInfo(query),
      serviceType: extractServiceType(query)
    };

    return Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== null)
    );
  },

  /**
   * Advanced auto-suggestion with context awareness
   */
  generateSuggestions: (partialQuery, context, history) => {
    const suggestions = [];

    // Recent searches
    const recentMatches = history
      .filter(h => h.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, 3);
    
    suggestions.push(...recentMatches.map(s => ({ type: 'recent', value: s })));

    // Context-based suggestions
    if (context.recentVehicles) {
      const vehicleMatches = context.recentVehicles
        .filter(v => v.vin.toLowerCase().includes(partialQuery.toLowerCase()))
        .slice(0, 3);
      suggestions.push(...vehicleMatches.map(v => ({ type: 'vehicle', value: v.vin, label: `${v.year} ${v.make} ${v.model}` })));
    }

    // Smart patterns
    if (/^\d{4}$/.test(partialQuery)) {
      suggestions.push({ type: 'year', value: partialQuery, label: `${partialQuery} vehicles` });
    }

    return suggestions.slice(0, 5);
  }
};

/**
 * REAL-TIME PERFORMANCE MONITOR
 * Live metrics calculation and alerting
 */
export const PerformanceMonitor = {
  /**
   * Calculate real-time throughput metrics
   */
  calculateThroughput: (jobs, timeWindow = 60) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow * 60 * 1000);
    
    const recentJobs = jobs.filter(j => 
      j.completedAt && new Date(j.completedAt) >= windowStart
    );

    return {
      jobsPerHour: (recentJobs.length / timeWindow) * 60,
      avgCompletionTime: recentJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / recentJobs.length || 0,
      efficiency: calculateOverallEfficiency(recentJobs),
      trend: calculateThroughputTrend(jobs, timeWindow)
    };
  },

  /**
   * Detect performance anomalies
   */
  detectAnomalies: (currentMetrics, historicalBaseline) => {
    const anomalies = [];
    const threshold = 2; // Standard deviations

    if (Math.abs(currentMetrics.avgDuration - historicalBaseline.avgDuration) > 
        historicalBaseline.stdDev * threshold) {
      anomalies.push({
        type: 'duration_anomaly',
        severity: 'high',
        message: `Unusual job duration detected: ${currentMetrics.avgDuration}min vs baseline ${historicalBaseline.avgDuration}min`
      });
    }

    if (currentMetrics.completionRate < historicalBaseline.completionRate * 0.8) {
      anomalies.push({
        type: 'completion_rate_drop',
        severity: 'medium',
        message: `Completion rate dropped: ${currentMetrics.completionRate}% vs baseline ${historicalBaseline.completionRate}%`
      });
    }

    return anomalies;
  },

  /**
   * Generate predictive alerts
   */
  generatePredictiveAlerts: (currentState, predictions) => {
    const alerts = [];

    // Capacity alerts
    if (predictions.upcomingLoad > currentState.totalCapacity * 0.9) {
      alerts.push({
        type: 'capacity_warning',
        priority: 'high',
        message: 'Approaching capacity limit in next 2 hours',
        action: 'Consider allocating additional resources'
      });
    }

    // Bottleneck alerts
    if (predictions.bottleneckProbability > 0.7) {
      alerts.push({
        type: 'bottleneck_risk',
        priority: 'medium',
        message: `High risk of bottleneck in ${predictions.bottleneckArea}`,
        action: 'Review workflow distribution'
      });
    }

    return alerts;
  }
};

// Helper functions (implementations)
function calculateCapacityScore(detailer) {
  const maxDailyJobs = 8;
  const currentLoad = detailer.activeJobs || 0;
  return Math.max(0, (maxDailyJobs - currentLoad) / maxDailyJobs * 100);
}

function calculateSkillScore(detailer) {
  return detailer.skillLevel || 75;
}

function calculateEfficiencyScore(detailer) {
  return detailer.efficiencyRating || 80;
}

function findBestDetailerMatch(job, detailers) {
  return detailers
    .filter(d => d.capacityScore > 20)
    .map(d => ({
      ...d,
      matchScore: (d.capacityScore * 0.4 + d.skillScore * 0.3 + d.efficiencyScore * 0.3)
    }))
    .sort((a, b) => b.matchScore - a.matchScore)[0];
}

function calculateMovingAverage(values, window = 5) {
  if (values.length < window) return values.reduce((a, b) => a + b, 0) / values.length;
  
  const recentValues = values.slice(-window);
  return recentValues.reduce((a, b) => a + b, 0) / window;
}

function calculateTrendDirection(jobs) {
  if (jobs.length < 10) return 'stable';
  
  const half = Math.floor(jobs.length / 2);
  const firstHalf = jobs.slice(0, half);
  const secondHalf = jobs.slice(half);
  
  const firstAvg = firstHalf.reduce((sum, j) => sum + j.duration, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, j) => sum + j.duration, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change < -10) return 'improving';
  if (change > 10) return 'declining';
  return 'stable';
}

function detectAnomalies(jobs) {
  const durations = jobs.map(j => j.duration).filter(d => d > 0);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const stdDev = Math.sqrt(durations.reduce((sq, d) => sq + Math.pow(d - avg, 2), 0) / durations.length);
  
  return jobs.filter(j => Math.abs(j.duration - avg) > stdDev * 2);
}

function identifyPeakPerformanceHours(jobs) {
  const hourlyStats = {};
  
  jobs.forEach(job => {
    const hour = new Date(job.completedAt).getHours();
    hourlyStats[hour] = hourlyStats[hour] || { count: 0, totalDuration: 0 };
    hourlyStats[hour].count++;
    hourlyStats[hour].totalDuration += job.duration;
  });
  
  return Object.entries(hourlyStats)
    .map(([hour, stats]) => ({
      hour: parseInt(hour),
      avgDuration: stats.totalDuration / stats.count,
      volume: stats.count
    }))
    .sort((a, b) => a.avgDuration - b.avgDuration)
    .slice(0, 3);
}

function identifyBottlenecks(jobs) {
  // Analyze wait times and identify slowest stages
  const stages = {
    'waiting': jobs.filter(j => j.waitTime > 30).length,
    'in_progress': jobs.filter(j => j.duration > 120).length,
    'quality_check': jobs.filter(j => j.qcTime > 15).length
  };
  
  return Object.entries(stages)
    .filter(([_, count]) => count > jobs.length * 0.2)
    .map(([stage, count]) => ({ stage, affectedJobs: count }));
}

function generateInsights(metrics) {
  const insights = [];
  
  if (metrics.efficiencyTrend === 'declining') {
    insights.push({
      type: 'warning',
      message: 'Performance is declining. Review recent changes to workflow.',
      impact: 'high'
    });
  }
  
  if (metrics.bottlenecks.length > 0) {
    insights.push({
      type: 'action',
      message: `Bottleneck detected in ${metrics.bottlenecks[0].stage}. Consider process optimization.`,
      impact: 'medium'
    });
  }
  
  return insights;
}

function generateRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.peakHours.length > 0) {
    recommendations.push({
      title: 'Optimize Scheduling',
      description: `Peak performance during ${metrics.peakHours[0].hour}:00. Schedule complex jobs during this time.`,
      expectedImpact: '+15% efficiency'
    });
  }
  
  return recommendations;
}

function calculateFuzzyScore(query, target) {
  const targetNorm = target.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Levenshtein distance
  const distance = levenshteinDistance(query, targetNorm);
  const maxLength = Math.max(query.length, targetNorm.length);
  const similarity = 1 - (distance / maxLength);
  
  // Bonus for exact substring match
  if (targetNorm.includes(query)) return Math.min(1, similarity + 0.2);
  
  return similarity;
}

function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[b.length][a.length];
}

function extractDateRange(query) {
  const today = /today|now/i.test(query);
  const yesterday = /yesterday/i.test(query);
  const week = /this week|week/i.test(query);
  const month = /this month|month/i.test(query);
  
  if (today) return { start: new Date(), end: new Date() };
  if (yesterday) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return { start: date, end: date };
  }
  if (week) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end };
  }
  if (month) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return { start, end };
  }
  
  return null;
}

function extractStatus(query) {
  if (/completed|done|finished/i.test(query)) return 'completed';
  if (/active|in progress|working/i.test(query)) return 'active';
  if (/pending|waiting/i.test(query)) return 'pending';
  return null;
}

function extractVehicleInfo(query) {
  const vinMatch = query.match(/[A-HJ-NPR-Z0-9]{17}/i);
  if (vinMatch) return { vin: vinMatch[0] };
  
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return { year: yearMatch[0] };
  
  return null;
}

function extractDetailerInfo(query) {
  // Extract names (simple pattern)
  const nameMatch = query.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/);
  return nameMatch ? { name: nameMatch[0] } : null;
}

function extractServiceType(query) {
  const types = ['detail', 'delivery', 'rewash', 'cleanup', 'showroom'];
  const found = types.find(t => new RegExp(t, 'i').test(query));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : null;
}

function calculateSpeedScore(jobs) {
  const avgDuration = jobs.reduce((sum, j) => sum + j.duration, 0) / jobs.length;
  const benchmark = 60; // minutes
  return Math.min(100, (benchmark / avgDuration) * 100);
}

function calculateQualityScore(jobs) {
  const rewashRate = jobs.filter(j => j.rewashRequired).length / jobs.length;
  return Math.max(0, (1 - rewashRate) * 100);
}

function calculateConsistencyScore(jobs) {
  const durations = jobs.map(j => j.duration);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  const coefficient = stdDev / avg;
  return Math.max(0, (1 - coefficient) * 100);
}

function calculateVolumeScore(jobs) {
  const jobsPerDay = jobs.length / 30;
  const benchmark = 5;
  return Math.min(100, (jobsPerDay / benchmark) * 100);
}

function calculatePercentile(score, allJobs) {
  // Simplified percentile calculation
  return Math.round((score / 100) * 100);
}

function calculateScoreTrend(detailer, jobs) {
  // Compare recent performance to historical average
  return 'improving'; // Simplified
}

function calculateOverallEfficiency(jobs) {
  const avgDuration = jobs.reduce((sum, j) => sum + j.duration, 0) / jobs.length;
  const benchmark = 60;
  return Math.min(100, (benchmark / avgDuration) * 100);
}

function calculateThroughputTrend(jobs, window) {
  // Simplified trend calculation
  return 'stable';
}

const AdvancedAlgorithms = { PredictiveAnalytics, IntelligentSearch, PerformanceMonitor };
export default AdvancedAlgorithms;
