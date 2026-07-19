export const config = {
  crons: [
    {
      path: "/api/cron/reset-stale-thinking",
      schedule: "0 3 * * *",
    },
    {
      path: "/api/cron/purge-orphan-media",
      schedule: "0 4 * * 0",
    },
  ],
  headers: [
    {
      source: "/brand/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=604800, immutable",
        },
      ],
    },
  ],
};
