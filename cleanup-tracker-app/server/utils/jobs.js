
function jobToResponse(jobDoc) {
  if (!jobDoc) return null;
  const job = jobDoc.toObject({ virtuals: true });
  job.id = String(job._id);
  delete job._id;
  delete job.__v;
  return job;
}

function computeJobDuration(job, endTime = new Date()) {
  if (!job.startTime) {
    return job.duration || 0;
  }
  const end = endTime || new Date();
  let duration = Math.round((end.getTime() - job.startTime.getTime()) / (1000 * 60));
  if (job.pauseDuration) {
    duration -= job.pauseDuration;
  }
  return Math.max(0, duration);
}

module.exports = {
  jobToResponse,
  computeJobDuration
};
