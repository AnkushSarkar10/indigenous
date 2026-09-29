<script setup lang="ts">
import { computed } from "vue";

type Variant = "default" | "secondary" | "outline";

const props = withDefaults(defineProps<{ variant?: Variant }>(), {
  variant: "default",
});

const classes = computed(() => [
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    outline: "border-border text-foreground",
  }[props.variant],
]);
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
