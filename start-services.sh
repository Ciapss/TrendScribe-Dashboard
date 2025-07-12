#!/bin/bash

# TrendScribe Dashboard Start Services Script
# Quick script to start the dashboard service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$SCRIPT_DIR"

echo -e "${GREEN}Starting TrendScribe Dashboard...${NC}"

# Change to project directory
cd "$PROJECT_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed! Please run deploy.sh first.${NC}"
    exit 1
fi

# Start PM2 services
echo -e "${YELLOW}Starting PM2 services...${NC}"
pm2 start ecosystem.config.js --env production

# Wait for services to start
sleep 3

# Show status
echo -e "${GREEN}Dashboard started successfully!${NC}"
pm2 status

echo -e "\n${GREEN}TrendScribe Dashboard is running:${NC}"
echo -e "- Dashboard: http://localhost:3000"
echo -e "\nView logs: pm2 logs"
echo -e "Monitor: pm2 monit"