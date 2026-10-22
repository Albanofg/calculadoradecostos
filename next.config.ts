import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite'],
  // El indicador de dev se para justo encima del riel del total.
  devIndicators: false,
}

export default nextConfig
