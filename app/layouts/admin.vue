<script setup lang="ts">
import { LogOut, ShieldCheck } from "@lucide/vue";
import Button from "~/components/ui/button/Button.vue";

const route = useRoute();
const signingOut = ref(false);
const logoutError = ref("");
useSeoMeta({ robots: "noindex, nofollow" });

async function logout() {
  signingOut.value = true;
  logoutError.value = "";
  try {
    await $fetch("/api/admin/logout", { method: "POST" });
    clearNuxtData((key) => key.startsWith("admin-"));
    await navigateTo("/admin/login", { replace: true });
  } catch {
    logoutError.value = "Could not sign out. Please try again.";
  } finally {
    signingOut.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-border bg-card">
      <div class="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <NuxtLink to="/admin" class="flex items-center gap-3 font-semibold" aria-label="Indigenous admin home">
          <img src="/logo.png" alt="" class="size-10 object-contain">
          <span>Indigenous <span class="ml-2 border-l border-border pl-3 text-sm font-normal text-muted-foreground">Admin</span></span>
        </NuxtLink>
        <div class="flex items-center gap-4">
          <span class="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ShieldCheck class="size-4" aria-hidden="true" /> Team access</span>
          <Button v-if="route.path !== '/admin/login'" variant="outline" size="sm" :disabled="signingOut" @click="logout">
            <LogOut class="size-4" aria-hidden="true" /> {{ signingOut ? 'Signing out…' : 'Sign out' }}
          </Button>
        </div>
      </div>
    </header>
    <p v-if="logoutError" role="alert" class="mx-auto max-w-7xl px-5 pt-4 text-sm text-red-700">{{ logoutError }}</p>
    <main class="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10"><slot /></main>
  </div>
</template>
