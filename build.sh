#!/bin/bash
set -e

echo "Building Cleanup Tracker for Cloudflare Pages..."

# Install client dependencies
echo "Installing client dependencies..."
cd cleanup-tracker-app/client
npm install --legacy-peer-deps

# Build the client
echo "Building React client..."
npm run build

# Go back to root
cd ../..

# Create the final deployment structure
echo "Preparing deployment structure..."
rm -rf deploy-temp
mkdir -p deploy-temp

# Copy the built client files
cp -r cleanup-tracker-app/client/build/* deploy-temp/

# Copy functions to the deployment
cp -r functions deploy-temp/

# Copy routing config
cp _routes.json deploy-temp/

echo "Build complete! Deployment ready in deploy-temp/"
echo "Contents:"
ls -la deploy-temp/
echo "Functions:"
ls -la deploy-temp/functions/
