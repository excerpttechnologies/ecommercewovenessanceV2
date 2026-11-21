/**
 * PM2 process definition for the storefront.
 *
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save && pm2 startup
 *
 * Notes for this app specifically:
 *  - Each cluster worker has its own TTL cache (`src/lib/cache.ts`). Admin writes invalidate
 *    the local worker and `revalidatePath` tells every worker to re-render, so a stale entry in
 *    another worker clears on its next stale hit. Keep `instances` small (2) to limit duplicate
 *    cold MongoDB fan-outs; raise it only if you have measured the extra load.
 *  - MongoDB pools are per process: total connections ≈ instances × MONGODB_MAX_POOL_SIZE × 2.
 *    With 2 workers and the default pool of 10 that is at most 40 sockets across both databases.
 *  - Never put real secrets in this file. It reads them from the shell/.env at process start.
 */
const instances = Number(process.env.PM2_INSTANCES) > 0 ? Number(process.env.PM2_INSTANCES) : 2;

module.exports = {
  apps: [
    {
      name: "woven-essence",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "450M",
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: false,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        // Tune per VPS. See .env.example for all supported knobs.
        MONGODB_MAX_POOL_SIZE: process.env.MONGODB_MAX_POOL_SIZE || "10",
        MONGODB_MIN_POOL_SIZE: process.env.MONGODB_MIN_POOL_SIZE || "2",
        MONGO_QUERY_CONCURRENCY: process.env.MONGO_QUERY_CONCURRENCY || "11",
        IMAGE_PROBE_BUDGET_MS: process.env.IMAGE_PROBE_BUDGET_MS || "1200",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_file: "logs/pm2-combined.log",
      time: true,
      merge_logs: true,
    },
  ],
};
