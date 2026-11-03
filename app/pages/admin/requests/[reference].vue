<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue";
import Button from "~/components/ui/button/Button.vue";
import { formatAdminDate } from "~/utils/admin-date";
import type { AdminRequestDetail } from "~~/shared/types/admin";

definePageMeta({ layout: "admin", middleware: "admin" });
const route = useRoute();
const reference = computed(() => String(route.params.reference).toUpperCase());
useSeoMeta({ title: () => `${reference.value} | Indigenous admin` });
const { data, status, error, refresh } = await useFetch<AdminRequestDetail>(() => `/api/admin/requests/${encodeURIComponent(reference.value)}`, { key: computed(() => `admin-request-${reference.value}`) });
watch(error, (value) => { if (value?.statusCode === 401) navigateTo("/admin/login", { replace: true }); }, { immediate: true });
const totalQuantity = computed(() => data.value?.items.reduce((total, item) => total + item.quantity, 0) || 0);
</script>

<template>
  <section>
    <NuxtLink :to="{ path: '/admin', query: route.query }" class="mb-7 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft class="size-4" aria-hidden="true" /> Back to requests</NuxtLink>
    <div v-if="error" class="rounded-2xl border border-border bg-card px-6 py-16 text-center"><h1 class="text-2xl font-semibold">{{ error.statusCode === 404 ? 'Request not found' : 'Could not load request' }}</h1><p role="alert" class="mt-3 text-muted-foreground">{{ error.data?.statusMessage || 'Please try again.' }}</p><Button v-if="error.statusCode !== 404" variant="outline" class="mt-5" @click="refresh()">Try again</Button></div>
    <p v-else-if="status === 'pending'" role="status" class="py-20 text-center text-muted-foreground">Loading request…</p>
    <template v-else-if="data">
      <div class="mb-8"><p class="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Quote request</p><h1 class="text-4xl font-semibold tracking-tight">{{ data.reference }}</h1><p class="mt-3 text-muted-foreground">Submitted <time :datetime="data.createdAt">{{ formatAdminDate(data.createdAt) }}</time></p></div>
      <div class="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
        <section class="rounded-2xl border border-border bg-card p-6 shadow-sm" aria-labelledby="customer-heading">
          <h2 id="customer-heading" class="mb-6 text-xl font-semibold">Customer details</h2>
          <dl class="space-y-5 break-words text-sm"><div><dt class="text-muted-foreground">Name</dt><dd class="mt-1 text-base font-medium">{{ data.firstName }} {{ data.lastName }}</dd></div><div><dt class="text-muted-foreground">Organisation</dt><dd class="mt-1">{{ data.organisation || 'Not provided' }}</dd></div><div><dt class="text-muted-foreground">Email</dt><dd class="mt-1 select-all">{{ data.email }}</dd></div><div><dt class="text-muted-foreground">Contact number</dt><dd class="mt-1 select-all">{{ data.contactNumber }}</dd></div><div><dt class="text-muted-foreground">Address</dt><dd class="mt-1 whitespace-pre-wrap">{{ data.address || 'Not provided' }}</dd></div></dl>
        </section>
        <div class="space-y-6">
          <section class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="items-heading">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border p-6"><h2 id="items-heading" class="text-xl font-semibold">Requested equipment</h2><span class="text-sm text-muted-foreground">{{ data.items.length }} {{ data.items.length === 1 ? 'product' : 'products' }} · {{ totalQuantity }} {{ totalQuantity === 1 ? 'unit' : 'units' }}</span></div>
            <div class="relative overflow-x-auto"><table class="w-full text-left text-sm"><caption class="sr-only">Products and quantities saved when this request was submitted</caption><thead class="border-b border-border bg-muted/60 text-muted-foreground"><tr><th scope="col" class="px-6 py-3 font-medium">Product</th><th scope="col" class="px-6 py-3 font-medium">SKU</th><th scope="col" class="px-6 py-3 text-right font-medium">Quantity</th></tr></thead><tbody class="divide-y divide-border"><tr v-for="item in data.items" :key="item.skuSnapshot"><td class="px-6 py-5 font-medium">{{ item.nameSnapshot }}</td><td class="px-6 py-5 text-muted-foreground">{{ item.skuSnapshot }}</td><td class="px-6 py-5 text-right font-semibold">{{ item.quantity }}</td></tr></tbody></table></div>
          </section>
          <section class="rounded-2xl border border-border bg-card p-6 shadow-sm" aria-labelledby="notes-heading"><h2 id="notes-heading" class="text-xl font-semibold">Customer notes</h2><p class="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{{ data.notes || 'No additional notes.' }}</p></section>
        </div>
      </div>
    </template>
  </section>
</template>
