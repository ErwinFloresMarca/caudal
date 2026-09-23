module.exports = {
  apps: [
    {
      name: 'caudal',
      script: '.output/server/index.mjs',
      cwd: '/var/www/caudal/current',
      interpreter: 'node',
      interpreter_args: '--env-file=.env',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      autorestart: true,
      exp_backoff_restart_delay: 100
    }
  ]
}
