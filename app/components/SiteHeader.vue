<script setup lang="ts">
import { ArrowRight, ChevronDown, Menu, X } from "@lucide/vue";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
  NavigationMenuTrigger,
} from "reka-ui";
import { ref, watch } from "vue";
import { SPECIALTIES } from "~/constants/specialties";

const route = useRoute();
const mobileOpen = ref(false);
const mobileProductsOpen = ref(false);

const productLink = (specialty: string) => ({
  path: "/products",
  query: { specialty },
});

watch(() => route.fullPath, () => {
  mobileOpen.value = false;
  mobileProductsOpen.value = false;
});
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
    <div class="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
      <NuxtLink to="/" class="group flex items-center gap-3" aria-label="Indigenous home">
        <img
          src="/logo.png"
          alt=""
          class="size-11 object-contain transition-transform group-hover:-rotate-3"
        >
        <span class="text-lg font-bold leading-none tracking-[-0.02em]">Indigenous</span>
      </NuxtLink>

      <NavigationMenuRoot class="relative hidden lg:block" aria-label="Main navigation">
        <NavigationMenuList class="flex list-none items-center gap-1">
          <NavigationMenuItem>
            <NavigationMenuLink as-child :active="route.path === '/' && !route.hash">
              <NuxtLink to="/" class="desktop-nav-link">Home</NuxtLink>
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink as-child>
              <NuxtLink to="/" class="desktop-nav-link">About Us</NuxtLink>
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem value="products">
            <NavigationMenuTrigger
              as-child
              class="desktop-nav-link group inline-flex items-center gap-1.5"
              :class="{ 'is-active': route.path === '/products' }"
            >
              <NuxtLink to="/products">
                Products
                <ChevronDown
                  class="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </NuxtLink>
            </NavigationMenuTrigger>
            <NavigationMenuContent class="nav-menu-content absolute right-0 top-[calc(100%+0.65rem)] w-[30rem]">
              <div class="overflow-hidden rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[0_24px_70px_-24px_rgba(15,23,42,.25)]">
                <ul class="list-none">
                  <li v-for="specialty in SPECIALTIES" :key="specialty" class="border-b border-border/70 last:border-0">
                    <NavigationMenuLink as-child>
                      <NuxtLink
                        :to="productLink(specialty)"
                        class="group flex items-center justify-between gap-6 rounded-lg px-4 py-3 text-lg font-bold tracking-[-0.01em] outline-none transition hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span>{{ specialty }}</span>
                        <ArrowRight class="size-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </NuxtLink>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink as-child>
              <NuxtLink to="/" class="desktop-nav-link">Contact Us</NuxtLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenuRoot>

      <button
        type="button"
        class="grid size-10 place-items-center rounded-full border border-border bg-background text-foreground shadow-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        :aria-expanded="mobileOpen"
        aria-controls="mobile-navigation"
        :aria-label="mobileOpen ? 'Close navigation' : 'Open navigation'"
        @click="mobileOpen = !mobileOpen"
      >
        <X v-if="mobileOpen" class="size-5" aria-hidden="true" />
        <Menu v-else class="size-5" aria-hidden="true" />
      </button>
    </div>

    <Transition name="mobile-menu">
      <nav
        v-if="mobileOpen"
        id="mobile-navigation"
        class="border-t border-border bg-background px-5 pb-6 pt-3 sm:px-8 lg:hidden"
        aria-label="Mobile navigation"
      >
        <div class="mx-auto max-w-7xl">
          <NuxtLink to="/" class="mobile-nav-link">Home</NuxtLink>
          <NuxtLink to="/" class="mobile-nav-link">About Us</NuxtLink>

          <div class="flex min-h-13 items-center border-b border-border">
            <NuxtLink to="/products" class="flex min-h-13 flex-1 items-center text-lg font-bold text-foreground">
              Products
            </NuxtLink>
            <button
              type="button"
              class="grid size-10 place-items-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              :aria-expanded="mobileProductsOpen"
              aria-controls="mobile-products"
              aria-label="Toggle product specialties"
              @click="mobileProductsOpen = !mobileProductsOpen"
            >
              <ChevronDown
                class="size-4 transition-transform duration-200"
                :class="{ 'rotate-180': mobileProductsOpen }"
                aria-hidden="true"
              />
            </button>
          </div>

          <Transition name="mobile-products">
            <div v-if="mobileProductsOpen" id="mobile-products" class="mb-2 rounded-xl bg-muted/65 p-2">
              <NuxtLink
                v-for="specialty in SPECIALTIES"
                :key="specialty"
                :to="productLink(specialty)"
                class="group flex items-center justify-between gap-4 border-b border-border/70 px-3 py-3 text-base font-bold last:border-0"
              >
                <span>{{ specialty }}</span>
                <ArrowRight class="size-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </NuxtLink>
            </div>
          </Transition>

          <NuxtLink to="/" class="mobile-nav-link">Contact Us</NuxtLink>
        </div>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.desktop-nav-link {
  border-radius: 9999px;
  padding: 0.55rem 0.9rem;
  color: var(--muted-foreground);
  font-size: 0.925rem;
  font-weight: 700;
  line-height: 1.25rem;
  outline: none;
}

.desktop-nav-link:hover,
.desktop-nav-link:focus-visible,
.desktop-nav-link[data-active],
.desktop-nav-link.is-active,
.desktop-nav-link[data-state="open"] {
  background: var(--muted);
  color: var(--foreground);
}

.desktop-nav-link:focus-visible {
  box-shadow: 0 0 0 2px var(--ring);
}

.nav-menu-content[data-state="open"] {
  animation: menu-in 180ms ease-out;
}

.nav-menu-content[data-state="closed"] {
  animation: menu-out 140ms ease-in;
}

.mobile-nav-link {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
  font-size: 1.125rem;
  font-weight: 700;
  text-decoration: none;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active,
.mobile-products-enter-active,
.mobile-products-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to,
.mobile-products-enter-from,
.mobile-products-leave-to {
  opacity: 0;
  transform: translateY(-0.4rem);
}

@keyframes menu-in {
  from { opacity: 0; transform: translateY(-0.35rem) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes menu-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-0.25rem) scale(0.99); }
}

@media (prefers-reduced-motion: reduce) {
  .nav-menu-content,
  .mobile-menu-enter-active,
  .mobile-menu-leave-active,
  .mobile-products-enter-active,
  .mobile-products-leave-active {
    animation: none !important;
    transition: none !important;
  }
}
</style>
