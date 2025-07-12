#!/bin/bash

# TrendScribe Dashboard Deployment Script
# This script sets up and deploys the TrendScribe Dashboard with PM2

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$SCRIPT_DIR"
LOGS_DIR="$PROJECT_DIR/logs"

echo -e "${GREEN}Starting TrendScribe Dashboard deployment...${NC}"

# Change to project directory
cd "$PROJECT_DIR"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed!${NC}"
    exit 1
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 is not installed. Installing globally...${NC}"
    sudo npm install -g pm2
fi

# Create logs directory if it doesn't exist
echo -e "${YELLOW}Setting up logs directory...${NC}"
mkdir -p "$LOGS_DIR"

# Install Node dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm install

# Update dashboard environment BEFORE building
echo -e "${YELLOW}Creating dashboard .env.local...${NC}"
cat > "$PROJECT_DIR/.env.local" << EOF
NEXT_PUBLIC_API_URL=https://trendscribe-api.maciej.ai/api/v1
EOF

# Build the Next.js dashboard
echo -e "${YELLOW}Building Next.js dashboard...${NC}"
npm run build

# Stop existing PM2 processes if any
echo -e "${YELLOW}Stopping existing PM2 processes...${NC}"
pm2 stop ecosystem.config.js || true
pm2 delete ecosystem.config.js || true

# Start services with PM2
echo -e "${YELLOW}Starting dashboard with PM2...${NC}"
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
echo -e "${YELLOW}Setting up PM2 startup script...${NC}"
pm2 startup systemd -u $USER --hp $HOME

# Display status
echo -e "${GREEN}Dashboard deployment complete!${NC}"
echo -e "${YELLOW}Service Status:${NC}"
pm2 status

echo -e "\n${GREEN}Dashboard is running:${NC}"
echo -e "- Dashboard: http://localhost:3000"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Configure nginx for domain setup (trendscribe.maciej.ai)"
echo -e "2. Ensure backend API is running at https://trendscribe-api.maciej.ai"
echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "- View logs: pm2 logs"
echo -e "- Monitor: pm2 monit"
echo -e "- Restart: pm2 restart all"
echo -e "- Stop: pm2 stop all"