<script setup lang="ts">
withDefaults(defineProps<{ current?: "page" | "step" }>(), { current: "page" });
</script>

<template>
  <span data-slot="breadcrumb-page" role="link" aria-disabled="true" :aria-current="current" class="font-normal text-foreground">
    <slot />
  </span>
</template>
