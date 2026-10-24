<script setup lang="ts">
import { Primitive } from "reka-ui";

withDefaults(defineProps<{ as?: string; asChild?: boolean }>(), { as: "a" });
</script>

<template>
  <Primitive :as="as" :as-child="asChild" data-slot="breadcrumb-link" class="transition-colors hover:text-foreground">
    <slot />
  </Primitive>
</template>
