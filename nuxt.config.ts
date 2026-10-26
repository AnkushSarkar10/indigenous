// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // Enable only when a trusted reverse proxy overwrites X-Forwarded-For.
    quoteRequestTrustProxy: false,
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  css: [
    "~/assets/css/main.css",
  ],
})
