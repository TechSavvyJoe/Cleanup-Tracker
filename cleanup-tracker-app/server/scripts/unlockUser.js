#!/usr/bin/env node
/**
 * Unlock a V2 user account by clearing failed login counters and lockout timer.
 *
 * Examples:
 *   node scripts/unlockUser.js 64f0c5c9f6fa3b2a1c8a1234      # by ObjectId
 *   node scripts/unlockUser.js --employee=DET001             # by employee number
 *   node scripts/unlockUser.js --username=manager            # by username
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const chalk = require('chalk');
const { mongoURI } = require('../config/keys');
const V2User = require('../models/V2User');

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg) => {
    if (arg.startsWith('--employee=')) {
      args.employeeNumber = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--username=')) {
      args.username = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--uid=')) {
      args.uid = arg.split('=').slice(1).join('=');
    } else if (arg === '--force') {
      args.force = true;
    } else if (!arg.startsWith('--') && !args.identifier) {
      args.identifier = arg;
    }
  });
  return args;
}

async function resolveUser(query) {
  if (query.identifier && mongoose.Types.ObjectId.isValid(query.identifier)) {
    const byId = await V2User.findById(query.identifier);
    if (byId) return byId;
  }

  if (query.employeeNumber) {
    const byEmployee = await V2User.findOne({ employeeNumber: query.employeeNumber.toUpperCase() });
    if (byEmployee) return byEmployee;
  }

  if (query.username) {
    const byUsername = await V2User.findOne({ username: query.username.toLowerCase() });
    if (byUsername) return byUsername;
  }

  if (query.uid) {
    const byUid = await V2User.findOne({ uid: query.uid });
    if (byUid) return byUid;
  }

  if (query.identifier) {
    const normalized = query.identifier.trim();
    const byEmployee = await V2User.findOne({ employeeNumber: normalized.toUpperCase() });
    if (byEmployee) return byEmployee;
    const byUsername = await V2User.findOne({ username: normalized.toLowerCase() });
    if (byUsername) return byUsername;
    const byUid = await V2User.findOne({ uid: normalized });
    if (byUid) return byUid;
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.identifier && !args.employeeNumber && !args.username && !args.uid) {
    console.error(chalk.red('Usage: node scripts/unlockUser.js <identifier> [--employee=...] [--username=...] [--uid=...] [--force]'));
    process.exit(1);
  }

  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
  console.log(chalk.cyan('Connected to MongoDB'));

  const user = await resolveUser(args);
  if (!user) {
    console.error(chalk.red('User not found for provided identifier(s).'));
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!args.force) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const confirmation = await new Promise((resolve) => {
      readline.question(
        `Unlock account for ${user.name} (${user.employeeNumber || user.username || user.id})? [y/N]: `,
        (answer) => {
          readline.close();
          resolve(String(answer || '').trim().toLowerCase() === 'y');
        }
      );
    });

    if (!confirmation) {
      console.log(chalk.yellow('Aborted by user.'));
      await mongoose.disconnect();
      process.exit(0);
    }
  }

  user.resetFailedLogin();
  await user.save();

  console.log(
    chalk.green(
      `Unlocked account for ${user.name} (ID: ${user.id}). Failed attempts reset to ${user.failedLoginAttempts}.`
    )
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(chalk.red('Failed to unlock user'), err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
