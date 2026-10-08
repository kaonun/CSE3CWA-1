/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["drizzle-orm", "@libsql/client", "libsql"],
};

export default nextConfig;
