// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    adminEmail: "",
    adminPasswordHash: "",
    adminSessionSecret: "",
    // Enable only when a trusted reverse proxy overwrites X-Forwarded-For.
    quoteRequestTrustProxy: false,
    quoteEmailEnabled: false,
    resendFromEmail: "Indigenous <onboarding@resend.dev>",
    resendQuoteTemplateId: "",
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: { "* * * * *": ["quote-emails"] },
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
