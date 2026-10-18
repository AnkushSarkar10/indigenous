<template>
  <div class="min-h-screen bg-background text-foreground antialiased">
    <NuxtRouteAnnouncer />
    <SiteHeader />

    <main>
      <NuxtPage />
    </main>

    <footer id="contact" class="scroll-mt-20 border-t border-border bg-muted/30">
      <div class="mx-auto flex max-w-7xl justify-end px-5 py-8 text-sm text-muted-foreground sm:px-8 lg:px-10">
        <p>© {{ new Date().getFullYear() }} Indigenous</p>
      </div>
    </footer>
  </div>
</template>
