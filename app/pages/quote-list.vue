<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, CircleCheck, ImageOff, LoaderCircle, Minus, Plus, ShoppingCart, Trash2 } from "@lucide/vue";
import { computed, nextTick, reactive, ref } from "vue";
import Breadcrumb from "~/components/ui/breadcrumb/Breadcrumb.vue";
import BreadcrumbItem from "~/components/ui/breadcrumb/BreadcrumbItem.vue";
import BreadcrumbLink from "~/components/ui/breadcrumb/BreadcrumbLink.vue";
import BreadcrumbList from "~/components/ui/breadcrumb/BreadcrumbList.vue";
import BreadcrumbPage from "~/components/ui/breadcrumb/BreadcrumbPage.vue";
import Button from "~/components/ui/button/Button.vue";
import Input from "~/components/ui/input/Input.vue";
import type { InquiryItem } from "~/composables/useInquiryList";

useSeoMeta({
  title: "Request a quote · Indigenous",
  description: "Review the equipment and quantities in your inquiry list.",
});

const { items, isLoaded, itemCount, setQuantity, removeItem } = useInquiryList();
const failedImages = ref(new Set<string>());
const announcement = ref("");
const step = ref<"items" | "details">("items");
const stepHeading = ref<HTMLElement>();
const form = reactive({ firstName: "", lastName: "", organisation: "", email: "", contactNumber: "", address: "", notes: "", consent: false });
const submissionKey = ref("");
const submitting = ref(false);
const submitError = ref("");
const reference = ref("");
const submittedItems = ref<InquiryItem[]>([]);
const flowSteps = ["My Cart", "Contact details", "Submit request"];
const currentFlowStep = computed(() => reference.value || submitting.value ? 2 : step.value === "details" ? 1 : 0);

async function focusHeading() {
  await nextTick();
  stepHeading.value?.focus();
}

async function proceed() {
  if (!items.value.length) return;
  step.value = "details";
  await focusHeading();
}

async function editItems() {
  step.value = "items";
  submitError.value = "";
  await focusHeading();
}

async function submitRequest() {
  if (submitting.value || !items.value.length || !form.consent) return;
  submissionKey.value ||= crypto.randomUUID();
  submitting.value = true;
  submitError.value = "";
  const selected = items.value.map((item) => ({ ...item }));
  try {
    const result = await $fetch("/api/quote-requests", {
      method: "POST",
      body: { ...form, submissionKey: submissionKey.value, items: selected.map(({ sku, quantity }) => ({ sku, quantity })) },
    });
    submittedItems.value = selected;
    reference.value = result.reference;
    items.value = [];
    // Contact details stay in memory only while the form is being completed.
    Object.assign(form, { firstName: "", lastName: "", organisation: "", email: "", contactNumber: "", address: "", notes: "", consent: false });
    await focusHeading();
  } catch (error: unknown) {
    const response = error as { data?: { statusMessage?: string }; statusCode?: number };
    submitError.value = (response.statusCode === 400 || response.statusCode === 503) && response.data?.statusMessage
      ? response.data.statusMessage
      : "We couldn’t submit your request. Your details and items are still here. Please try again.";
  } finally {
    submitting.value = false;
  }
}

function removeFromInquiry(sku: string, name: string) {
  removeItem(sku);
  announcement.value = `${name} removed from your quote list.`;
}
</script>

<template>
  <section class="mx-auto min-h-[calc(100vh-9rem)] max-w-5xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14" :aria-busy="!isLoaded">
    <NuxtLink to="/products" class="inline-flex items-center gap-2 rounded text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft class="size-4" aria-hidden="true" />
      Continue browsing
    </NuxtLink>

    <div class="mb-8 mt-6">
      <h1 ref="stepHeading" tabindex="-1" class="text-3xl font-bold tracking-tight outline-none sm:text-4xl">{{ reference ? 'Thank you for your request' : step === 'details' ? 'Your contact details' : 'Request a quote' }}</h1>
      <p class="mt-3 text-muted-foreground">{{ reference ? 'Your quote request has been received for our sales team to review.' : step === 'details' ? 'Tell us a little about yourself so our sales team can help with your quote.' : 'Review the equipment you’ve added to your inquiry.' }}</p>
      <Breadcrumb v-if="isLoaded && (items.length || reference)" aria-label="Quote request progress" class="quote-flow mt-6">
        <BreadcrumbList class="quote-flow-list">
          <BreadcrumbItem v-for="(label, index) in flowSteps" :key="label" class="quote-flow-item" :class="{ 'is-reached': index <= currentFlowStep }" :data-state="index === currentFlowStep ? 'current' : index < currentFlowStep ? 'complete' : 'upcoming'">
            <BreadcrumbPage v-if="index === currentFlowStep" current="step" class="quote-flow-label">
              <span class="quote-flow-marker"><Check v-if="reference" class="size-5" aria-hidden="true" /><span v-else>{{ index + 1 }}</span><span v-if="reference" class="sr-only">{{ index + 1 }}.</span></span><span>{{ label }}</span>
            </BreadcrumbPage>
            <BreadcrumbLink v-else-if="index === 0 && step === 'details' && !reference" as-child>
              <button type="button" class="quote-flow-label quote-flow-action" :disabled="submitting" @click="editItems"><span class="quote-flow-marker"><Check class="size-5" aria-hidden="true" /><span class="sr-only">{{ index + 1 }}.</span></span><span>{{ label }}</span></button>
            </BreadcrumbLink>
            <span v-else class="quote-flow-label" :aria-disabled="index > currentFlowStep ? 'true' : undefined"><span class="quote-flow-marker"><Check v-if="index < currentFlowStep" class="size-5" aria-hidden="true" /><span :class="{ 'sr-only': index < currentFlowStep }">{{ index + 1 }}</span></span><span>{{ label }}</span></span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <p role="status" class="sr-only">{{ announcement }}</p>

    <div v-if="reference" class="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <CircleCheck class="mb-4 size-10 text-primary" aria-hidden="true" />
      <h2 class="text-xl font-semibold">Your request is in</h2>
      <p class="mt-2 text-muted-foreground">We’ll use the contact details you provided to respond about your selected equipment.</p>
      <p class="mt-4 break-all text-sm">Your reference: <strong>{{ reference }}</strong></p>
      <h3 class="mb-3 mt-6 font-semibold">Requested items</h3>
      <ul class="divide-y divide-border border-y border-border">
        <li v-for="item in submittedItems" :key="item.sku" class="flex justify-between gap-4 py-3 text-sm"><span>{{ item.name }} <span class="text-muted-foreground">({{ item.sku }})</span></span><span class="shrink-0 font-semibold">Qty {{ item.quantity }}</span></li>
      </ul>
      <Button as="NuxtLink" to="/products" class="mt-6">Continue browsing</Button>
    </div>

    <div v-else-if="!isLoaded" role="status" class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-muted/40 px-6 py-16 text-center">
      <LoaderCircle class="size-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
    </div>

    <template v-else-if="items.length">
      <div :class="{ 'quote-details-layout': step === 'details' }">
        <div :class="{ 'quote-summary': step === 'details' }" :role="step === 'details' ? 'complementary' : undefined" :aria-labelledby="step === 'details' ? 'selected-items-title' : undefined">
          <div v-if="step === 'details'" class="mb-3 flex items-center justify-between gap-2">
            <h2 id="selected-items-title" class="text-base font-semibold">Your selected items</h2>
            <Button type="button" variant="ghost" size="sm" class="-mr-2 h-8 px-2 text-xs" :disabled="submitting" @click="editItems"><ArrowLeft class="size-3.5" aria-hidden="true" />Edit items</Button>
          </div>
          <p class="quote-count mb-4 text-sm text-muted-foreground" aria-live="polite">
            <span class="font-semibold text-foreground">{{ itemCount }}</span> {{ itemCount === 1 ? 'item' : 'items' }} in your inquiry
          </p>

          <ul class="divide-y divide-border border-y border-border">
            <li v-for="item in items" :key="item.sku" class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-x-6 sm:py-5">
              <div class="quote-item-image row-span-2 grid h-14 w-16 place-items-center overflow-hidden sm:row-span-1 sm:h-16 sm:w-24">
                <img
                  v-if="item.imageUrl && !failedImages.has(item.sku)"
                  :src="item.imageUrl"
                  :alt="item.name"
                  class="h-full w-full object-contain mix-blend-multiply"
                  @error="failedImages = new Set([...failedImages, item.sku])"
                >
                <ImageOff v-else class="size-6 text-muted-foreground/50" aria-hidden="true" />
              </div>

              <div class="min-w-0">
                <h2 class="quote-item-title text-base font-medium leading-snug sm:text-lg">{{ item.name }}</h2>
                <p class="quote-item-sku mt-1 break-words text-sm text-muted-foreground">Item no: {{ item.sku }}</p>
              </div>

              <div v-if="step === 'items'" class="col-start-2 flex items-center justify-end gap-3 sm:col-start-3 sm:row-start-auto sm:gap-4">
                <div class="flex items-center gap-2 rounded-full bg-muted p-1" role="group" :aria-label="`Quantity for ${item.name}`">
                  <button class="grid size-8 shrink-0 place-items-center rounded-full border-2 border-current outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35" type="button" :disabled="item.quantity <= 1" :aria-label="`Decrease quantity of ${item.name}`" @click="setQuantity(item.sku, item.quantity - 1)">
                    <Minus class="size-4" aria-hidden="true" />
                  </button>
                  <span class="min-w-7 text-center text-base font-semibold tabular-nums">{{ item.quantity }}</span>
                  <button class="grid size-8 shrink-0 place-items-center rounded-full border-2 border-current outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35" type="button" :disabled="item.quantity >= 9999" :aria-label="`Increase quantity of ${item.name}`" @click="setQuantity(item.sku, item.quantity + 1)">
                    <Plus class="size-4" aria-hidden="true" />
                  </button>
                </div>
                <button type="button" class="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" :aria-label="`Remove ${item.name} from inquiry`" @click="removeFromInquiry(item.sku, item.name)">
                  <Trash2 class="size-5" aria-hidden="true" />
                </button>
              </div>
              <p v-else class="quote-item-quantity col-start-2 text-sm font-semibold sm:col-start-3">Qty {{ item.quantity }}</p>
            </li>
          </ul>

          <div v-if="step === 'items'" class="mt-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
            <p class="text-sm text-muted-foreground">Ready? Add your contact details in the next step.</p>
            <Button type="button" size="lg" @click="proceed">Proceed<ArrowRight class="size-4" aria-hidden="true" /></Button>
          </div>
        </div>

        <form v-if="step === 'details'" class="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-8" :aria-busy="submitting" @submit.prevent="submitRequest">
          <fieldset :disabled="submitting" class="min-w-0">
            <legend class="text-xl font-semibold">How can we reach you?</legend>
            <p class="mb-6 mt-2 text-sm text-muted-foreground">Fields marked <span class="font-medium text-primary">*</span> are required.</p>
            <div class="grid gap-5 sm:grid-cols-2">
              <div class="space-y-2"><label for="quote-first-name" class="text-sm font-medium">First name <span aria-hidden="true" class="text-primary">*</span></label><Input id="quote-first-name" v-model="form.firstName" name="given-name" autocomplete="given-name" maxlength="100" pattern=".*\S.*" required /></div>
              <div class="space-y-2"><label for="quote-last-name" class="text-sm font-medium">Last name <span aria-hidden="true" class="text-primary">*</span></label><Input id="quote-last-name" v-model="form.lastName" name="family-name" autocomplete="family-name" maxlength="100" pattern=".*\S.*" required /></div>
              <div class="space-y-2 sm:col-span-2"><label for="quote-organisation" class="text-sm font-medium">Name of organisation <span class="font-normal text-muted-foreground">(optional)</span></label><Input id="quote-organisation" v-model="form.organisation" name="organization" autocomplete="organization" maxlength="200" /></div>
              <div class="space-y-2"><label for="quote-email" class="text-sm font-medium">Email address <span aria-hidden="true" class="text-primary">*</span></label><Input id="quote-email" v-model="form.email" type="email" name="email" autocomplete="email" maxlength="254" required /></div>
              <div class="space-y-2"><label for="quote-phone" class="text-sm font-medium">Contact number <span aria-hidden="true" class="text-primary">*</span></label><Input id="quote-phone" v-model="form.contactNumber" type="tel" name="tel" autocomplete="tel" maxlength="40" pattern="[+0-9\s.\(\)\-]{7,40}" placeholder="Include your country or area code" required /></div>
              <div class="space-y-2 sm:col-span-2"><label for="quote-address" class="text-sm font-medium">Address <span class="font-normal text-muted-foreground">(optional)</span></label><textarea id="quote-address" v-model="form.address" name="street-address" autocomplete="street-address" rows="3" maxlength="1000" class="quote-textarea" placeholder="Street address, city, state, postal code and country" /></div>
              <div class="space-y-2 sm:col-span-2"><label for="quote-notes" class="text-sm font-medium">Additional notes <span class="font-normal text-muted-foreground">(optional)</span></label><textarea id="quote-notes" v-model="form.notes" name="notes" rows="4" maxlength="3000" class="quote-textarea" placeholder="Tell our sales team about your requirements, delivery timeline, or any questions." /></div>
            </div>

            <div class="mt-6 rounded-xl border border-border p-4 sm:p-5">
              <h3 class="font-medium">Your details, used with care</h3>
              <p id="quote-data-use" class="mt-2 text-sm leading-6 text-muted-foreground">Indigenous will collect and store the contact details, selected items and notes you provide to prepare your quote and contact you about this request. Please avoid including patient information or other sensitive personal details in your notes.</p>
              <label for="quote-consent" class="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6"><input id="quote-consent" v-model="form.consent" type="checkbox" name="consent" required aria-describedby="quote-data-use" class="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span>I agree to the collection and use of the information above for my quote request.</span></label>
            </div>
            <p v-if="submitError" role="alert" class="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{{ submitError }}</p>
            <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" @click="editItems"><ArrowLeft class="size-4" aria-hidden="true" />Back to items</Button>
              <Button type="submit" size="lg" :disabled="submitting || !form.consent"><LoaderCircle v-if="submitting" class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{{ submitting ? 'Submitting…' : 'Submit quote request' }}<ArrowRight v-if="!submitting" class="size-4" aria-hidden="true" /></Button>
            </div>
          </fieldset>
        </form>
      </div>
    </template>

    <div v-else class="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <div class="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-secondary text-primary">
        <ShoppingCart class="size-7" aria-hidden="true" />
      </div>
      <h2 class="text-xl font-semibold">Your quote list is empty</h2>
      <p class="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Browse our equipment and select “Add to inquiry” to start your list.</p>
      <Button as="NuxtLink" to="/products" class="mt-6">Browse equipment</Button>
    </div>
  </section>
</template>

<style scoped>
@reference "../assets/css/main.css";
.quote-details-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 24px;
}
.quote-summary {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card);
}
.quote-summary .quote-count { margin-bottom: 12px; font-size: 12px; }
.quote-summary li {
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 12px;
  padding-block: 14px;
}
.quote-summary .quote-item-image { grid-row: 1; width: 48px; height: 48px; }
.quote-summary .quote-item-title { font-size: 14px; }
.quote-summary .quote-item-sku { font-size: 11px; line-height: 1.5; }
.quote-summary .quote-item-quantity { grid-column: 3; grid-row: 1; white-space: nowrap; font-size: 12px; }
@media (min-width: 1024px) {
  .quote-details-layout { grid-template-columns: 280px minmax(0, 1fr); }
}
.quote-flow-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 0;
  padding-top: 6px;
}
.quote-flow-item {
  position: relative;
  display: flex;
  min-width: 0;
  gap: 0;
  color: var(--muted-foreground);
}
.quote-flow-item:not(:last-child)::after {
  content: "";
  position: absolute;
  top: 22px;
  left: calc(50% + 30px);
  width: calc(100% - 60px);
  height: 2px;
  border-radius: 999px;
  background: var(--border);
}
.quote-flow-item[data-state="complete"]::after { background: var(--primary); }
.quote-flow-label {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  min-width: 0;
  padding: 0 4px 6px;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
}
.quote-flow-marker {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--background);
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
}
.quote-flow-item[data-state="complete"] { color: var(--foreground); }
.quote-flow-item[data-state="complete"] .quote-flow-marker {
  border-color: var(--primary);
  background: var(--secondary);
  color: var(--primary);
}
.quote-flow-item[data-state="current"] { color: var(--primary); }
.quote-flow-item[data-state="current"] .quote-flow-label { font-weight: 600; }
.quote-flow-item[data-state="current"] .quote-flow-marker {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: 0 0 0 5px var(--secondary);
}
.quote-flow-action { width: 100%; border-radius: 12px; cursor: pointer; }
.quote-flow-action:hover { color: var(--primary); }
.quote-flow-action:focus-visible { outline: 2px solid var(--ring); outline-offset: 4px; }
.quote-flow-action:disabled { cursor: wait; opacity: 0.6; }
@media (min-width: 640px) {
  .quote-flow-label { font-size: 15px; }
}
.quote-textarea {
  @apply block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-50;
  resize: vertical;
}
</style>
