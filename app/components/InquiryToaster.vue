<script setup lang="ts">
import { CircleCheck, X } from "@lucide/vue";
import { ToastClose, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from "reka-ui";

const { additionNotices } = useInquiryList();

function dismissNotice(id: number) {
  additionNotices.value = additionNotices.value.filter((notice) => notice.id !== id);
}
</script>

<template>
  <ToastProvider :duration="4000" swipe-direction="right">
    <ToastRoot
      v-for="notice in additionNotices"
      :key="notice.id"
      class="flex shrink-0 items-start gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg"
      @update:open="(open) => { if (!open) dismissNotice(notice.id); }"
    >
      <CircleCheck class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <ToastTitle class="min-w-0 flex-1 break-words text-sm font-medium leading-6">
        {{ notice.productName }} added to enquiry
      </ToastTitle>
      <ToastClose class="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Dismiss notification">
        <X class="size-4" aria-hidden="true" />
      </ToastClose>
    </ToastRoot>
    <ToastViewport class="pointer-events-none fixed bottom-5 right-5 z-[100] m-0 flex max-h-[calc(100dvh-6rem)] w-[calc(100%-2.5rem)] max-w-sm list-none flex-col gap-3 overflow-y-auto outline-none [&>*]:pointer-events-auto" />
  </ToastProvider>
</template>
