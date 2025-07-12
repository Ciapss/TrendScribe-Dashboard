#!/bin/bash

# TrendScribe Dashboard Stop Services Script
# Clean shutdown of dashboard service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$SCRIPT_DIR"

echo -e "${YELLOW}Stopping TrendScribe Dashboard...${NC}"

# Change to project directory
cd "$PROJECT_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed!${NC}"
    exit 1
fi

# Show current status
echo -e "${YELLOW}Current service status:${NC}"
pm2 status

# Stop all PM2 processes
echo -e "${YELLOW}Stopping PM2 processes...${NC}"
pm2 stop ecosystem.config.js || true

# Optionally delete processes from PM2 list (uncomment if desired)
# echo -e "${YELLOW}Removing processes from PM2...${NC}"
# pm2 delete ecosystem.config.js || true

# Save PM2 state
pm2 save

echo -e "${GREEN}Dashboard stopped successfully!${NC}"
pm2 status

echo -e "\n${YELLOW}To completely remove processes from PM2:${NC}"
echo -e "pm2 delete ecosystem.config.js"
echo -e "\n${YELLOW}To restart dashboard:${NC}"
echo -e "./start-services.sh"