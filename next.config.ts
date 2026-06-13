import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Next walks up and finds
  // a stray package-lock.json in the user's home dir and warns about ambiguity.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
