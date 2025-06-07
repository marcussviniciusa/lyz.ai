/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'minio', 'pdf-parse'],
  images: {
    domains: ['localhost', 's3.marcussviniciusa.cloud'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig 