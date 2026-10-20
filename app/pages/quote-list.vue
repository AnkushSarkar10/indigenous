<script setup lang="ts">
import { ArrowLeft, ImageOff, LoaderCircle, Minus, Plus, ShoppingCart, Trash2 } from "@lucide/vue";
import { ref } from "vue";
import Button from "~/components/ui/button/Button.vue";

useSeoMeta({
  title: "Request a quote · Indigenous",
  description: "Review the equipment and quantities in your inquiry list.",
});

const { items, isLoaded, itemCount, setQuantity, removeItem } = useInquiryList();
const failedImages = ref(new Set<string>());
const announcement = ref("");

function removeFromInquiry(sku: string, name: string) {
  removeItem(sku);
  announcement.value = `${name} removed from your quote list.`;
}
</script>

<template>
  <section class="mx-auto min-h-[calc(100vh-9rem)] max-w-5xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14" :aria-busy="!isLoaded">
    <NuxtLink to="/products" class="inline-flex items-center gap-2 rounded text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft class="size-4" aria-hidden="true" />
      Continue browsing
    </NuxtLink>

    <div class="mb-8 mt-6">
      <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Request a quote</h1>
      <p class="mt-3 text-muted-foreground">Review the equipment you’ve added to your inquiry.</p>
    </div>

    <p role="status" class="sr-only">{{ announcement }}</p>

    <div v-if="!isLoaded" role="status" class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-muted/40 px-6 py-16 text-center">
      <LoaderCircle class="size-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
    </div>

    <template v-else-if="items.length">
      <p class="mb-4 text-sm text-muted-foreground" aria-live="polite">
        <span class="font-semibold text-foreground">{{ itemCount }}</span> {{ itemCount === 1 ? 'item' : 'items' }} in your inquiry
      </p>

      <ul class="divide-y divide-border border-y border-border">
        <li v-for="item in items" :key="item.sku" class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-x-6 sm:py-5">
          <div class="row-span-2 grid h-14 w-16 place-items-center overflow-hidden sm:row-span-1 sm:h-16 sm:w-24">
            <img
              v-if="item.imageUrl && !failedImages.has(item.sku)"
              :src="item.imageUrl"
              :alt="item.name"
              class="h-full w-full object-contain mix-blend-multiply"
              @error="failedImages = new Set([...failedImages, item.sku])"
            >
            <ImageOff v-else class="size-6 text-muted-foreground/50" aria-hidden="true" />
          </div>

          <div class="min-w-0">
            <h2 class="text-base font-medium leading-snug sm:text-lg">{{ item.name }}</h2>
            <p class="mt-1 break-words text-sm text-muted-foreground">Item no: {{ item.sku }}</p>
          </div>

          <div class="col-start-2 flex items-center justify-end gap-3 sm:col-start-3 sm:row-start-auto sm:gap-4">
            <div class="flex items-center gap-2 rounded-full bg-muted p-1" role="group" :aria-label="`Quantity for ${item.name}`">
              <button class="grid size-8 shrink-0 place-items-center rounded-full border-2 border-current outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35" type="button" :disabled="item.quantity <= 1" :aria-label="`Decrease quantity of ${item.name}`" @click="setQuantity(item.sku, item.quantity - 1)">
                <Minus class="size-4" aria-hidden="true" />
              </button>
              <span class="min-w-7 text-center text-base font-semibold tabular-nums">{{ item.quantity }}</span>
              <button class="grid size-8 shrink-0 place-items-center rounded-full border-2 border-current outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring" type="button" :aria-label="`Increase quantity of ${item.name}`" @click="setQuantity(item.sku, item.quantity + 1)">
                <Plus class="size-4" aria-hidden="true" />
              </button>
            </div>
            <button type="button" class="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" :aria-label="`Remove ${item.name} from inquiry`" @click="removeFromInquiry(item.sku, item.name)">
              <Trash2 class="size-5" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>
    </template>

    <div v-else class="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <div class="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-secondary text-primary">
        <ShoppingCart class="size-7" aria-hidden="true" />
      </div>
      <h2 class="text-xl font-semibold">Your quote list is empty</h2>
      <p class="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Browse our equipment and select “Add to inquiry” to start your list.</p>
      <Button as="NuxtLink" to="/products" class="mt-6">Browse equipment</Button>
    </div>
  </section>
</template>
