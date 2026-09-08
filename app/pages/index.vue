<script setup lang="ts">
import Badge from "~/components/ui/badge/Badge.vue";
import Button from "~/components/ui/button/Button.vue";
import Card from "~/components/ui/card/Card.vue";
import CardContent from "~/components/ui/card/CardContent.vue";

useSeoMeta({
  title: "Indigenous Medical Systems",
  description: "Precision endourology instruments designed for confident clinical care.",
});

const focusAreas = [
  { label: "Cystoscopy", detail: "Clear visualization for confident diagnosis", number: "01" },
  { label: "Laser Enucleation", detail: "Purpose-built systems for precise treatment", number: "02" },
  { label: "Stone Management", detail: "Complete solutions for complex procedures", number: "03" },
];
</script>

<template>
  <div class="overflow-hidden">
    <section class="relative border-b border-border">
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div class="absolute -right-32 top-10 size-[34rem] rounded-full bg-emerald-100/70 blur-3xl" />
        <div class="absolute -left-32 bottom-0 size-80 rounded-full bg-teal-50 blur-3xl" />
        <div class="hero-grid absolute inset-0 opacity-45" />
      </div>

      <div class="relative mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-16 px-5 py-20 sm:px-8 lg:grid-cols-[1.06fr_.94fr] lg:px-10 lg:py-24">
        <div>
          <Badge variant="outline" class="mb-7 bg-background/80 px-3 py-1.5 backdrop-blur">
            <span class="mr-2 inline-block size-1.5 rounded-full bg-emerald-500" />
            Engineered for better outcomes
          </Badge>
          <h1 class="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
            Precision you can <span class="text-primary">see.</span><br>
            Quality you can trust.
          </h1>
          <p class="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
            Advanced endourology instruments designed around the people who use them—and the patients who depend on them.
          </p>
          <div class="mt-9 flex flex-wrap items-center gap-3">
            <Button as="NuxtLink" to="/products" size="lg">
              Explore all products
              <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Button>
          </div>
          <div class="mt-14 flex gap-9 border-t border-border pt-6 sm:gap-14">
            <div>
              <p class="text-2xl font-semibold tracking-tight">30+</p>
              <p class="mt-1 text-sm text-muted-foreground">specialized instruments</p>
            </div>
            <div>
              <p class="text-2xl font-semibold tracking-tight">6</p>
              <p class="mt-1 text-sm text-muted-foreground">clinical categories</p>
            </div>
          </div>
        </div>

        <div class="relative mx-auto w-full max-w-xl lg:mx-0">
          <div class="absolute -inset-5 rounded-[2.25rem] border border-emerald-100 bg-white/45 backdrop-blur-sm" />
          <div class="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-3 shadow-[0_30px_90px_-45px_rgba(5,80,65,.5)]">
            <div class="relative aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-[#e7f2ee]">
              <img
                src="https://rz-medizintechnik.com/wp-content/uploads/20hl.jpg"
                alt="Precision medical instrument"
                class="h-full w-full object-cover mix-blend-multiply"
              >
              <div class="absolute inset-x-4 bottom-4 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur-lg">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Featured system</p>
                <p class="mt-2 text-xl font-semibold tracking-tight">22 Charr. Laser Resectoscope</p>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">A minimally invasive approach with uncompromising image quality.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
      <div class="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Areas of focus</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Built around clinical practice</h2>
        </div>
        <NuxtLink to="/products" class="group inline-flex items-center gap-2 text-sm font-semibold text-primary">
          View the full catalogue
          <span class="transition-transform group-hover:translate-x-1">→</span>
        </NuxtLink>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <Card v-for="area in focusAreas" :key="area.label" class="group overflow-hidden shadow-none transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5">
          <CardContent class="p-7">
            <span class="text-xs font-semibold tracking-[0.2em] text-muted-foreground">{{ area.number }}</span>
            <div class="mt-12 flex items-end justify-between gap-5">
              <div>
                <h3 class="text-xl font-semibold tracking-tight">{{ area.label }}</h3>
                <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ area.detail }}</p>
              </div>
              <span class="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">↗</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-grid {
  background-image: linear-gradient(to right, rgb(5 80 65 / 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(5 80 65 / 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
}
</style>
