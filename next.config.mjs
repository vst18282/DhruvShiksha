/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ecosystem ships ESM that benefits from transpilation in Next 14
  transpilePackages: ['three'],
};

export default nextConfig;
