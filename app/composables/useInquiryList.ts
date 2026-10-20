import { computed } from "vue";
import type { Product } from "../../types/product";

const ADD_COOLDOWN_MS = 600;

export type InquiryItem = Pick<Product, "sku" | "name" | "category" | "imageUrl"> & {
  quantity: number;
};

export function useInquiryList() {
  const items = useState<InquiryItem[]>("inquiry-list", () => []);
  const isLoaded = useState<boolean>("inquiry-list-loaded", () => false);
  const additionNotices = useState<{ id: number; productName: string }[]>("inquiry-addition-notices", () => []);
  const noticeSequence = useState<number>("inquiry-addition-sequence", () => 0);
  const coolingDownSkus = useState<string[]>("inquiry-add-cooldowns", () => []);
  const itemCount = computed(() => items.value.reduce((total, item) => total + item.quantity, 0));

  function addItem(product: Product) {
    if (coolingDownSkus.value.includes(product.sku)) return;

    coolingDownSkus.value.push(product.sku);
    setTimeout(() => {
      coolingDownSkus.value = coolingDownSkus.value.filter((sku) => sku !== product.sku);
    }, ADD_COOLDOWN_MS);

    const existing = items.value.find((item) => item.sku === product.sku);

    if (existing) {
      existing.quantity += 1;
    } else {
      items.value.push({
        sku: product.sku,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        quantity: 1,
      });
    }

    additionNotices.value.push({
      id: ++noticeSequence.value,
      productName: product.name,
    });
  }

  function setQuantity(sku: string, quantity: number) {
    const item = items.value.find((entry) => entry.sku === sku);
    if (item && Number.isSafeInteger(quantity) && quantity > 0) item.quantity = quantity;
  }

  function removeItem(sku: string) {
    items.value = items.value.filter((item) => item.sku !== sku);
  }

  return { items, isLoaded, itemCount, additionNotices, coolingDownSkus, addItem, setQuantity, removeItem };
}
