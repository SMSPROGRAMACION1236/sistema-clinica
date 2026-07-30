/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@sistema-clinica/db"],
};

export default nextConfig;
