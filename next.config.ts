import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite'],
  // El indicador de dev se para justo encima del riel del total.
  devIndicators: false,
  /**
   * Next reenvía la consola del navegador a la terminal. Apagado porque las
   * extensiones de wallet tiran un `unhandledRejection` con código -32603 en
   * cada carga, y eso tapaba los errores que sí importan.
   *
   * Los errores del navegador siguen apareciendo en DevTools (F12). Para
   * recuperar el reenvío, poner 'warn' acá.
   */
  logging: {
    browserToTerminal: false,
  },
}

export default nextConfig
