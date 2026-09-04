<script setup lang="ts">
import { computed, resolveComponent } from "vue";

type Variant = "default" | "secondary" | "outline" | "ghost";
type Size = "default" | "sm" | "lg" | "icon";

const props = withDefaults(defineProps<{
  as?: string;
  variant?: Variant;
  size?: Size;
}>(), {
  as: "button",
  variant: "default",
  size: "default",
});

const classes = computed(() => [
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }[props.variant],
  {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-12 rounded-lg px-6",
    icon: "size-10",
  }[props.size],
]);

const component = computed(() => props.as === "NuxtLink" ? resolveComponent("NuxtLink") : props.as);
</script>

<template>
  <component :is="component" :class="classes">
    <slot />
  </component>
</template>
