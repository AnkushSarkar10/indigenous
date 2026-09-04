<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Badge from "~/components/ui/badge/Badge.vue";
import Button from "~/components/ui/button/Button.vue";
import Checkbox from "~/components/ui/checkbox/Checkbox.vue";
import Card from "~/components/ui/card/Card.vue";
import CardContent from "~/components/ui/card/CardContent.vue";
import CardFooter from "~/components/ui/card/CardFooter.vue";
import CardHeader from "~/components/ui/card/CardHeader.vue";
import CardTitle from "~/components/ui/card/CardTitle.vue";
import Input from "~/components/ui/input/Input.vue";
import Select from "~/components/ui/select/Select.vue";
import type { Product } from "../../types/product";

useSeoMeta({
  title: "Products · Indigenous Medical Systems",
  description: "Explore our complete catalogue of specialized endourology instruments.",
});

const search = ref("");
const selectedCategory = ref("All products");
const selectedSpecialty = ref("All specialties");
const availableOnly = ref(false);
const failedImages = ref(new Set<string>());
const { data, status, error, refresh } = await useFetch<Product[]>("/api/products", {
  default: () => [],
});

const specialties = computed(() => [
  "All specialties",
  ...new Set(data.value.map((product) => product.specialty)),
]);

const categories = computed(() => [
  "All products",
  ...new Set(data.value
    .filter((product) => product.specialty === selectedSpecialty.value)
    .map((product) => product.category)),
]);

const products = computed(() => {
  const term = search.value.trim().toLowerCase();

  return data.value.filter((product) => {
    const matchesSpecialty = selectedSpecialty.value === "All specialties" || product.specialty === selectedSpecialty.value;
    const matchesCategory = selectedCategory.value === "All products" || product.category === selectedCategory.value;
    const matchesAvailability = !availableOnly.value || product.isAvailable;
    const matchesSearch = !term || [product.name, product.category, product.specialty, product.sku]
      .some((value) => value.toLowerCase().includes(term));

    return matchesSpecialty && matchesCategory && matchesAvailability && matchesSearch;
  });
});

watch(selectedSpecialty, () => {
  selectedCategory.value = "All products";
});

function markImageFailed(sku: string) {
  failedImages.value = new Set(failedImages.value).add(sku);
}

function clearFilters() {
  search.value = "";
  selectedCategory.value = "All products";
  selectedSpecialty.value = "All specialties";
  availableOnly.value = false;
}
</script>

<template>
  <section class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <h1 class="sr-only">Products</h1>
      <div class="sticky top-[4.5rem] z-40 -mx-2 mb-10 rounded-2xl border border-border bg-background/92 p-3 shadow-sm backdrop-blur-xl">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div class="flex flex-col gap-3 sm:flex-row">
            <div class="w-full sm:w-60">
              <label for="specialty" class="mb-1.5 block text-xs font-medium text-muted-foreground">Specialty</label>
              <Select id="specialty" v-model="selectedSpecialty" aria-label="Filter by specialty">
                <option v-for="specialty in specialties" :key="specialty" :value="specialty">{{ specialty }}</option>
              </Select>
            </div>
            <div class="w-full sm:w-auto">
              <span class="mb-1.5 block text-xs font-medium text-muted-foreground">Availability</span>
              <label for="available-only" class="flex h-11 cursor-pointer items-center gap-2.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition hover:bg-accent/50">
                <Checkbox id="available-only" v-model="availableOnly" />
                Available only
              </label>
            </div>
          </div>

          <div class="relative min-w-0 md:w-72 lg:w-80">
            <label for="product-search" class="mb-1.5 block text-xs font-medium text-muted-foreground">Search</label>
            <div class="relative">
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <Input id="product-search" v-model="search" type="search" placeholder="Search products or SKU…" class="pl-10" aria-label="Search products" />
            </div>
          </div>
        </div>

        <div
          v-if="selectedSpecialty !== 'All specialties'"
          class="mt-3 flex gap-2 overflow-x-auto border-t border-border pt-3"
          aria-label="Filter by category"
        >
          <Button
            v-for="category in categories"
            :key="category"
            size="sm"
            :variant="selectedCategory === category ? 'default' : 'ghost'"
            class="rounded-full"
            @click="selectedCategory = category"
          >
            {{ category }}
          </Button>
        </div>
      </div>

      <div class="mb-6 flex items-center justify-between gap-4">
        <p class="text-sm text-muted-foreground">
          Showing <span class="font-semibold text-foreground">{{ products.length }}</span> {{ products.length === 1 ? "product" : "products" }}
        </p>
        <button v-if="search || selectedCategory !== 'All products' || selectedSpecialty !== 'All specialties' || availableOnly" class="text-sm font-medium text-primary hover:underline" @click="clearFilters">
          Clear filters
        </button>
      </div>

      <div v-if="status === 'pending'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="index in 6" :key="index" class="overflow-hidden shadow-none">
          <div class="aspect-[4/3] animate-pulse bg-muted" />
          <CardHeader>
            <div class="h-3 w-24 animate-pulse rounded bg-muted" />
            <div class="h-6 w-4/5 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent><div class="h-16 animate-pulse rounded bg-muted" /></CardContent>
        </Card>
      </div>

      <div v-else-if="error" class="rounded-xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
        <p class="text-lg font-semibold">The catalogue could not be loaded.</p>
        <p class="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
        <Button class="mt-5" variant="outline" @click="refresh">Try again</Button>
      </div>

      <div v-else-if="products.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card
          v-for="product in products"
          :key="product.sku"
          class="group flex min-w-0 flex-col overflow-hidden shadow-none transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_50px_-24px_rgba(5,80,65,.35)]"
        >
          <div class="relative aspect-[16/10] overflow-hidden border-b border-border bg-gradient-to-br from-slate-50 to-emerald-50/70">
            <img
              v-if="product.imageUrl && !failedImages.has(product.sku)"
              :src="product.imageUrl"
              :alt="product.name"
              loading="lazy"
              class="h-full w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-[1.03]"
              @error="markImageFailed(product.sku)"
            >
            <div v-else class="grid h-full place-items-center text-muted-foreground">
              <svg viewBox="0 0 24 24" class="size-12 opacity-40" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                <path d="M12 21V8M8.5 11.5C5.3 10.9 3.6 8.8 3 5c3.8-.1 6.2 1.7 6.8 5M13.2 14c.7-4.5 3.2-7 7.8-7.2-.2 4.5-2.7 7-7.8 7.2Z" />
              </svg>
            </div>
            <Badge variant="secondary" class="absolute left-3 top-3 bg-white/90 shadow-sm backdrop-blur">{{ product.category }}</Badge>
          </div>

          <CardHeader class="!p-4 !pb-3">
            <CardTitle class="text-base leading-snug">{{ product.name }}</CardTitle>
          </CardHeader>
          <CardContent class="flex-1 !p-4 !pt-0">
            <p class="line-clamp-3 text-sm leading-5 text-muted-foreground">
              {{ product.description || "Precision-engineered for dependable clinical performance." }}
            </p>
          </CardContent>
          <CardFooter class="justify-between border-t border-border bg-muted/20 !p-4">
            <span class="truncate font-mono text-[11px] text-muted-foreground">{{ product.sku }}</span>
            <span :class="product.isAvailable ? 'text-emerald-700' : 'text-muted-foreground'" class="ml-3 inline-flex shrink-0 items-center gap-1.5 text-xs font-medium">
              <span :class="product.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'" class="size-1.5 rounded-full" />
              {{ product.isAvailable ? "Available" : "Unavailable" }}
            </span>
          </CardFooter>
        </Card>
      </div>

      <div v-else class="rounded-xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
        <p class="text-lg font-semibold">No products match your search.</p>
        <p class="mt-2 text-sm text-muted-foreground">Try another name, SKU, or category.</p>
        <Button class="mt-5" variant="outline" @click="clearFilters">Clear filters</Button>
      </div>
  </section>
</template>
