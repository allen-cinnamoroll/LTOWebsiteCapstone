module.exports = {
  apps: [
    {
      name: "lto-backend",
      script: "server.js",
      cwd: "/var/www/LTOWebsiteCapstone/backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      // Enable watch mode for auto-reload on file changes
      watch: true,
      watch_delay: 1000, // Wait 1 second after file change before restart
      ignore_watch: [
        "node_modules",
        "logs",
        "uploads",
        "*.log",
        ".git",
        "json",
        "scripts",
        "data",
        "model/ml_models"
      ],
      error_file: "/var/log/pm2/lto-backend-error.log",
      out_file: "/var/log/pm2/lto-backend-out.log",
      log_file: "/var/log/pm2/lto-backend.log",
      time: true,
    },
    {
      name: "deploy-webhook",
      script: "deploy-webhook.js",
      cwd: "/var/www/LTOWebsiteCapstone",
      instances: 1,
      exec_mode: "fork",
      env: {
        WEBHOOK_PORT: 9000,
        WEBHOOK_SECRET: "LTO_Webhook_2024_Secure_Key_7x9m2k5p8q1r4s6t",
      },
      error_file: "/var/log/pm2/webhook-error.log",
      out_file: "/var/log/pm2/webhook-out.log",
      log_file: "/var/log/pm2/webhook.log",
      time: true,
    },
  ],
};
