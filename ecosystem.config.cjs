module.exports = {
  apps: [
    {
      name: "dashboard-absensi",
      script: "node_modules/.bin/tsx",
      args: "server/index.ts",
      cwd: "/var/www/dashboardaplikasiabsen",
      env: {
        NODE_ENV: "production",
        PORT: 3483,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
    },
  ],
};
