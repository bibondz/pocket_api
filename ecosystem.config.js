module.exports = {
  apps: [{
    name: 'tank-api',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    ignore_watch: [
      'node_modules',
      'logs',
      '*.log',
      '.git',
      'docs',
      'docs/*'
    ],
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log'
  }]
}; 