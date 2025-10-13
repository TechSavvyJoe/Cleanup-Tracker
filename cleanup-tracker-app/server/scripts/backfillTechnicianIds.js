#!/usr/bin/env node
/**
 * Backfill technician assignments so they reference durable user ObjectIds
 * instead of legacy PIN / employee identifiers.
 *
 * Usage:
 *   node scripts/backfillTechnicianIds.js        # executes migration
 *   node scripts/backfillTechnicianIds.js --dry  # previews changes without writing
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const chalk = require('chalk');
const { mongoURI } = require('../config/keys');
const Job = require('../models/Job');
const V2User = require('../models/V2User');

const DRY_RUN = process.argv.includes('--dry') || process.argv.includes('--dry-run');

function isObjectIdLike(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

async function main() {
  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
  console.log(chalk.cyan('Connected to MongoDB'));

  const users = await V2User.find()
    .select('+pinHash +pin')
    .lean(false); // keep mongoose docs to use schema helpers

  const userById = new Map();
  const employeeNumberMap = new Map();
  const uidMap = new Map();
  const pinCandidateMap = new Map();

  for (const user of users) {
    const idStr = String(user._id);
    userById.set(idStr, user);
    if (user.employeeNumber) {
      employeeNumberMap.set(String(user.employeeNumber).toUpperCase(), user);
    }
    if (user.uid) {
      uidMap.set(String(user.uid), user);
    }
    if (user.pinLast4 && user.pinLength) {
      const key = `${user.pinLength}:${user.pinLast4}`;
      if (!pinCandidateMap.has(key)) pinCandidateMap.set(key, []);
      pinCandidateMap.get(key).push(user);
    }
  }

  const resolveCache = new Map();
  async function resolveUserId(raw) {
    const candidate = (raw ?? '').toString().trim();
    if (!candidate) return null;
    if (resolveCache.has(candidate)) return resolveCache.get(candidate);

    let resolvedUser = null;

    if (isObjectIdLike(candidate) && userById.has(candidate)) {
      resolvedUser = userById.get(candidate);
    } else if (employeeNumberMap.has(candidate.toUpperCase())) {
      resolvedUser = employeeNumberMap.get(candidate.toUpperCase());
    } else if (uidMap.has(candidate)) {
      resolvedUser = uidMap.get(candidate);
    } else if (/^[0-9]{4,8}$/.test(candidate)) {
      const key = `${candidate.length}:${candidate.slice(-4)}`;
      const pinMatches = pinCandidateMap.get(key) || [];
      for (const user of pinMatches) {
        // eslint-disable-next-line no-await-in-loop
        if (await user.verifyPin(candidate)) {
          resolvedUser = user;
          break;
        }
      }
    }

    const result = resolvedUser ? String(resolvedUser._id) : null;
    resolveCache.set(candidate, result);
    return result;
  }

  const jobs = await Job.find();
  console.log(chalk.cyan(`Processing ${jobs.length} jobs...`));

  const stats = {
    total: jobs.length,
    technicianUpdated: 0,
    assignedUpdated: 0,
    technicianNameUpdated: 0,
    unresolvedTechnicians: new Set(),
    unresolvedAssigned: new Set()
  };

  for (const job of jobs) {
    let changed = false;
    const originalTechId = job.technicianId ? String(job.technicianId) : '';
    const resolvedTechId = await resolveUserId(originalTechId);
    if (resolvedTechId && resolvedTechId !== originalTechId) {
      job.technicianId = resolvedTechId;
      stats.technicianUpdated += 1;
      changed = true;
    } else if (!resolvedTechId && originalTechId && !isObjectIdLike(originalTechId)) {
      stats.unresolvedTechnicians.add(originalTechId);
    }

    if (job.technicianId) {
      const resolvedUser = userById.get(job.technicianId);
      if (resolvedUser && job.technicianName !== resolvedUser.name) {
        job.technicianName = resolvedUser.name;
        stats.technicianNameUpdated += 1;
        changed = true;
      }
    }

    const assigned = Array.isArray(job.assignedTechnicianIds)
      ? job.assignedTechnicianIds.map((value) => (value == null ? '' : String(value)))
      : [];

    if (assigned.length > 0) {
      const updatedAssigned = [];
      let assignedChanged = false;
      for (const tech of assigned) {
        // eslint-disable-next-line no-await-in-loop
        const resolved = await resolveUserId(tech);
        if (resolved) {
          updatedAssigned.push(resolved);
          if (resolved !== tech) assignedChanged = true;
        } else {
          updatedAssigned.push(tech);
          stats.unresolvedAssigned.add(tech);
        }
      }

      const deduped = [...new Set(updatedAssigned)];
      const arraysDiffer =
        deduped.length !== assigned.length ||
        assigned.some((value, idx) => value !== deduped[idx]);

      if (assignedChanged || arraysDiffer) {
        job.assignedTechnicianIds = deduped;
        stats.assignedUpdated += 1;
        changed = true;
      }
    }

    if (changed) {
      if (DRY_RUN) {
        console.log(
          chalk.gray(
            `[dry-run] Job ${job._id} would update technicianId=${job.technicianId}, assigned=${job.assignedTechnicianIds.join(',')}`
          )
        );
      } else {
        // eslint-disable-next-line no-await-in-loop
        await job.save();
      }
    }
  }

  if (!DRY_RUN) {
    await mongoose.connection.close();
  }

  console.log(chalk.green('\nBackfill complete.'));
  console.log(
    chalk.green(
      `Updated technicianId on ${stats.technicianUpdated} jobs, synchronized technicianName on ${stats.technicianNameUpdated}, adjusted assignedTechnicianIds on ${stats.assignedUpdated}.`
    )
  );

  if (stats.unresolvedTechnicians.size > 0 || stats.unresolvedAssigned.size > 0) {
    console.log(chalk.yellow('\nUnresolved identifiers encountered:'));
    if (stats.unresolvedTechnicians.size > 0) {
      console.log(
        chalk.yellow(
          `  technicianId values requiring manual review (${stats.unresolvedTechnicians.size}): ${Array.from(
            stats.unresolvedTechnicians
          )
            .slice(0, 20)
            .join(', ')}${stats.unresolvedTechnicians.size > 20 ? ', ...' : ''}`
        )
      );
    }
    if (stats.unresolvedAssigned.size > 0) {
      console.log(
        chalk.yellow(
          `  assignedTechnicianIds requiring manual review (${stats.unresolvedAssigned.size}): ${Array.from(
            stats.unresolvedAssigned
          )
            .slice(0, 20)
            .join(', ')}${stats.unresolvedAssigned.size > 20 ? ', ...' : ''}`
        )
      );
    }
    console.log(
      chalk.yellow(
        'Consider reconciling these values manually or rerunning after adding missing users.'
      )
    );
  }

  if (DRY_RUN) {
    console.log(chalk.cyan('\nDry run complete – no changes were written.'));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(chalk.red('Backfill failed'), err);
  process.exit(1);
});
