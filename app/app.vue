<template>
  <div class="min-h-screen bg-background text-foreground antialiased">
    <NuxtRouteAnnouncer />

    <header class="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div class="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <NuxtLink to="/" class="group flex items-center gap-3" aria-label="Indigenous home">
          <img
            src="/logo.png"
            alt=""
            class="size-11 object-contain transition-transform group-hover:-rotate-3"
          >
          <span class="text-lg leading-none tracking-[-0.02em]">Indigenous</span>
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
