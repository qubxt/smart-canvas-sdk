/** @type {import('next').NextConfig} */
const nextConfig = {
  // Instructs Next.js to aggregate all required node_modules into a minimal folder
  output: "standalone",
  
  // Sets the tracing boundary to the service root inside the container
  outputFileTracingRoot: isDocker ? __dirname : ".",

  turbopack: {
    root: monorepoRoot,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
