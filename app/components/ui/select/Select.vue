<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
}
</script>

<template>
  <div class="relative">
    <select
      v-bind="$attrs"
      :value="modelValue"
      class="flex h-11 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
      @change="onChange"
    >
      <slot />
    </select>
    <svg viewBox="0 0 24 24" class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="m7 10 5 5 5-5" />
    </svg>
  </div>
</template>
