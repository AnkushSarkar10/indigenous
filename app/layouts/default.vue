<template>
  <div>
    <SiteHeader />
    <InquiryToaster />
    <main><slot /></main>
    <footer class="border-t border-border bg-background">
      <div class="mx-auto flex max-w-7xl justify-end px-5 py-8 text-sm text-muted-foreground sm:px-8 lg:px-10">
        <p>© {{ new Date().getFullYear() }} Indigenous</p>
      </div>
    </footer>
  </div>
</template>
