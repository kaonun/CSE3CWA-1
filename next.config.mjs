/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  output: "standalone",
  serverExternalPackages: ["drizzle-orm", "@libsql/client", "libsql"],
};

export default nextConfig;
