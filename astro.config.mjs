// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://servitecnology.com',
  trailingSlash: 'never',
  adapter: vercel(),
  redirects: {
    '/ecommerce': {
      status: 301,
      destination: '/repuestos'
    },
    '/soporte-tecnico': {
      status: 301,
      destination: '/soporte'
    },
    '/reparacion': {
      status: 301,
      destination: '/soporte'
    },
    '/pc-gaming': {
      status: 301,
      destination: '/gaming'
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
});