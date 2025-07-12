# TrendScribe Dashboard

Frontend dashboard for the TrendScribe AI-powered blog post generation system.

## Overview

This is a Next.js 15 application that provides a web interface for managing and monitoring the TrendScribe backend system. The dashboard allows users to:

- View and manage blog posts
- Monitor job progress and status
- Configure trending topic discovery
- Manage authentication and user settings
- View analytics and system metrics

## Architecture

- **Framework**: Next.js 15 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: React hooks and context
- **API Communication**: Custom TypeScript client connecting to TrendScribe backend
- **Authentication**: JWT token-based authentication

## Prerequisites

- Node.js 18+ 
- npm or yarn
- TrendScribe backend API running (separate repository)

## Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update .env.local with your backend API URL
echo "NEXT_PUBLIC_API_URL=https://your-backend-api.com/api/v1" > .env.local
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Using PM2 (Recommended)

```bash
# Deploy with all dependencies and PM2 setup
./deploy.sh

# Or manually:
npm install
npm run build
pm2 start ecosystem.config.js --env production
```

### Using Docker

```bash
# Build Docker image
docker build -t trendscribe-dashboard .

# Run container
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=https://your-api.com/api/v1 trendscribe-dashboard
```

## Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API base URL (required)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)

### API Integration

The dashboard connects to the TrendScribe backend via a TypeScript API client located in `src/lib/api-client.ts`. Ensure your backend API is running and accessible at the configured URL.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── lib/                # Utilities and API client
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

## Service Management

```bash
# Start dashboard
./start-services.sh

# Stop dashboard
./stop-services.sh

# View logs
pm2 logs

# Monitor processes
pm2 monit
```

## Integration with Backend

This dashboard is designed to work with the TrendScribe Python backend. Ensure:

1. Backend API is running and accessible
2. CORS is configured to allow dashboard domain
3. Authentication endpoints are available
4. WebSocket connections are properly configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Part of the TrendScribe project - AI-powered blog post generation system.
