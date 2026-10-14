#!/bin/bash

# Exit immediately if any command exits with a non-zero status
set -e

echo "=== Starting Frontend Deployment ==="

# Navigate to the frontend directory (where this script is located)
cd "$(dirname "$0")"

# 1. Pull latest changes from dev branch
echo "Pulling latest changes from origin dev..."
git pull origin dev

# 2. Install dependencies (in case package.json changed)
echo "Installing dependencies..."
npm install

# 3. Build the production application
echo "Building the application..."
npm run build

echo "=== Deployment Build Completed Successfully ==="
