#!/bin/bash

# Load environment variables from .env file in the project root
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
elif [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Set default values for environment variables
PROJECT_DIR=${PROJECT_DIR:-"proj-be"}
PORT=${PORT:-3012}

# Set the working directory
WORKING_DIR="/var/code/${PROJECT_DIR}"

# Log the configuration
echo "[$(date)] Configuration: PROJECT_DIR=$PROJECT_DIR, MODE=$MODE"
echo "[$(date)] Working directory: $WORKING_DIR"

# Check if the working directory exists
if [ ! -d "$WORKING_DIR" ]; then
    echo "[$(date)] ERROR: Working directory $WORKING_DIR does not exist"
    echo "[$(date)] Available directories in /var:"
    ls -la /var/ 2>/dev/null || echo "Cannot list /var directory"
    exit 1
fi

# Change to the working directory
cd "$WORKING_DIR" || {
    echo "[$(date)] ERROR: Failed to change to directory $WORKING_DIR"
    exit 1
}

# Get the current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Not a git repository or git command failed"
    exit 1
fi

# Log the start of the process
echo "[$(date)] Starting update check for branch: $CURRENT_BRANCH in $(pwd)..."

# Fetch all changes from remote
git fetch origin

# Get the current and remote commit hashes
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$CURRENT_BRANCH)

# Check if there are any changes
if [ "$LOCAL" = "$REMOTE" ]; then
    echo "[$(date)] No changes detected in branch $CURRENT_BRANCH. Skipping update."
    exit 0
fi

echo "[$(date)] Changes detected in branch $CURRENT_BRANCH. Starting update process..."

# Pull the changes
git pull origin $CURRENT_BRANCH

# Install dependencies
echo "[$(date)] Installing dependencies..."
yarn install

# Build the application
echo "[$(date)] Building application..."
yarn build

# Restart the application
echo "[$(date)] Restarting application..."
pm2 restart "restaurant-api-${PORT}"

echo "[$(date)] Update completed successfully for branch $CURRENT_BRANCH."
