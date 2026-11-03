<script setup lang="ts">
import { ArrowRight, LockKeyhole } from "@lucide/vue";
import Button from "~/components/ui/button/Button.vue";
import Input from "~/components/ui/input/Input.vue";

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Admin sign in | Indigenous" });
const email = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");

async function login() {
  submitting.value = true;
  errorMessage.value = "";
  try {
    await $fetch("/api/admin/login", { method: "POST", body: { email: email.value, password: password.value } });
    password.value = "";
    clearNuxtData((key) => key.startsWith("admin-"));
    await navigateTo("/admin", { replace: true });
  } catch (error) {
    const failure = error as { data?: { statusMessage?: string } };
    errorMessage.value = failure.data?.statusMessage || "Could not sign in. Please try again.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:mt-16 sm:p-9">
    <div class="mb-6 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary"><LockKeyhole class="size-6" aria-hidden="true" /></div>
    <h1 class="text-3xl font-semibold tracking-tight">Welcome back</h1>
    <p class="mt-2 text-muted-foreground">Sign in with your shared team account to view quote requests.</p>
    <form class="mt-8 space-y-5" :aria-busy="submitting" @submit.prevent="login">
      <div class="space-y-2">
        <label for="admin-email" class="block text-sm font-medium">Email address</label>
        <Input id="admin-email" v-model="email" type="email" name="email" autocomplete="username" required maxlength="254" :disabled="submitting" />
      </div>
      <div class="space-y-2">
        <label for="admin-password" class="block text-sm font-medium">Password</label>
        <Input id="admin-password" v-model="password" type="password" name="password" autocomplete="current-password" required :disabled="submitting" />
      </div>
      <p v-if="errorMessage" role="alert" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ errorMessage }}</p>
      <Button type="submit" class="w-full" :disabled="submitting">{{ submitting ? 'Signing in…' : 'Sign in' }}<ArrowRight class="size-4" aria-hidden="true" /></Button>
    </form>
    <NuxtLink to="/" class="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">Back to website</NuxtLink>
  </section>
</template>
