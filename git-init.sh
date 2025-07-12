#!/bin/bash

# Initialize git repository for TrendScribe Dashboard
set -e

echo "🚀 Initializing TrendScribe Dashboard Git Repository..."

# Initialize git repository
git init

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore file..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
/.pnp
.pnp.js

# Production builds
/.next/
/out/
/dist/

# Environment variables
.env*.local
.env.production

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# PM2
.pm2/

# Temporary files
*.tmp
*.temp
EOF
fi

# Add all files
echo "📁 Adding files to git..."
git add .

# Initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: TrendScribe Dashboard

🎉 Separated dashboard from backend repository
✨ Features:
- Next.js 15 with TypeScript
- Radix UI components with Tailwind CSS
- JWT authentication
- Real-time job monitoring
- Blog post management
- Industry and trend configuration
- PM2 deployment scripts

🔗 Backend API: ../TrendScribe-Python

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Git repository initialized successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Add remote origin:"
echo "   git remote add origin git@github.com:yourusername/trendscribe-dashboard.git"
echo "3. Push to GitHub:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🚀 To deploy the dashboard:"
echo "   ./deploy.sh"