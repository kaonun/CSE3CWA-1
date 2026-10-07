// Migrate the persistent volume before accepting requests; a failure stops boot.
await import("./migrate-database.mjs");
await import("../server.js");
