/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mongoose', 'minio', 'pdf-parse'],
  images: {
    domains: ['localhost', 's3.marcussviniciusa.cloud'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  i18n: {
    locales: ['pt-BR'],
    defaultLocale: 'pt-BR',
  },
}

module.exports = nextConfig 