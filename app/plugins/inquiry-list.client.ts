import { watch } from "vue";
import type { InquiryItem } from "~/composables/useInquiryList";

const STORAGE_KEY = "indigenous:inquiry-list";

function isInquiryItem(value: unknown): value is InquiryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.sku === "string" && item.sku.length > 0
    && typeof item.name === "string"
    && typeof item.category === "string"
    && (item.imageUrl === null || typeof item.imageUrl === "string")
    && typeof item.quantity === "number" && Number.isSafeInteger(item.quantity) && item.quantity > 0;
}

export default defineNuxtPlugin((nuxtApp) => {
  const { items, isLoaded } = useInquiryList();

  nuxtApp.hook("app:mounted", () => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        const seen = new Set<string>();
        items.value = saved.filter((item): item is InquiryItem => {
          if (!isInquiryItem(item) || seen.has(item.sku)) return false;
          seen.add(item.sku);
          return true;
        });
      }
    } catch {
      // The list still works when storage is unavailable or contains invalid JSON.
    } finally {
      isLoaded.value = true;
    }

    watch(items, (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Keep the current session usable if the browser cannot save the list.
      }
    }, { deep: true });
  });
});
