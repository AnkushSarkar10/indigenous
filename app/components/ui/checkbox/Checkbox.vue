<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{ modelValue?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <input
    v-bind="$attrs"
    type="checkbox"
    :checked="modelValue"
    class="peer sr-only"
    @change="onChange"
  >
  <span class="grid size-4 shrink-0 place-items-center rounded border border-primary text-transparent shadow-sm transition peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:bg-primary peer-checked:text-primary-foreground">
    <svg viewBox="0 0 24 24" class="size-3" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  </span>
</template>
