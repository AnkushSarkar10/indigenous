<template>
  <div class="min-h-screen bg-background text-foreground antialiased">
    <NuxtRouteAnnouncer />

    <header class="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div class="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <NuxtLink to="/" class="group flex items-center gap-3" aria-label="Indigenous home">
          <span class="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-3">
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 21V8" />
              <path d="M8.5 11.5C5.3 10.9 3.6 8.8 3 5c3.8-.1 6.2 1.7 6.8 5" />
              <path d="M13.2 14c.7-4.5 3.2-7 7.8-7.2-.2 4.5-2.7 7-7.8 7.2Z" />
            </svg>
          </span>
          <span>
            <span class="block font-semibold leading-none tracking-[-0.02em]">Indigenous</span>
            <span class="mt-1 block text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Medical Systems</span>
          </span>
        </NuxtLink>

        <nav class="flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1" aria-label="Main navigation">
          <NuxtLink to="/" class="nav-link">Home</NuxtLink>
          <NuxtLink to="/products" class="nav-link">Products</NuxtLink>
        </nav>
      </div>
    </header>

    <main>
      <NuxtPage />
    </main>

    <footer class="border-t border-border bg-muted/30">
      <div class="mx-auto flex max-w-7xl justify-end px-5 py-8 text-sm text-muted-foreground sm:px-8 lg:px-10">
        <p>© {{ new Date().getFullYear() }} Indigenous</p>
      </div>
    </footer>
  </div>
</template>
