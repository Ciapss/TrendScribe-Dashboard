module.exports = {
  apps: [
    {
      name: 'trendscribe-dashboard',
      script: 'npm',
      args: 'run start',
      cwd: process.cwd(),
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://trendscribe-api.maciej.ai/api/v1',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/pm2-dashboard-error.log',
      out_file: './logs/pm2-dashboard-out.log',
      log_file: './logs/pm2-dashboard-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      listen_timeout: 5000,
      restart_delay: 5000,
    }
  ],

  deploy: {
    production: {
      user: 'maciej',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/trendscribe-dashboard.git',
      path: process.cwd(),
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      'post-setup': 'echo "Dashboard setup complete"'
    }
  }
};