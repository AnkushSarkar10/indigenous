<script setup lang="ts">
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, Search } from "@lucide/vue";
import Button from "~/components/ui/button/Button.vue";
import Input from "~/components/ui/input/Input.vue";
import { formatAdminDate } from "~/utils/admin-date";
import type { AdminRequestList } from "~~/shared/types/admin";

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Quote requests | Indigenous admin" });
const route = useRoute();
const router = useRouter();
const activeSearch = computed(() => typeof route.query.search === "string" ? route.query.search : "");
const search = ref(activeSearch.value);
watch(activeSearch, (value) => { search.value = value; });
const sort = computed(() => route.query.sort === "oldest" ? "oldest" : "newest");
const query = computed(() => ({ search: activeSearch.value, sort: sort.value, page: typeof route.query.page === "string" ? route.query.page : "1" }));
const { data, status, error, refresh } = await useFetch<AdminRequestList>("/api/admin/requests", { key: "admin-requests", query });
watch(error, (value) => { if (value?.statusCode === 401) navigateTo("/admin/login", { replace: true }); }, { immediate: true });

const liveState = ref<"live" | "paused" | "reconnecting">("live");
let liveTimer: ReturnType<typeof setInterval> | undefined;
let liveRequest: AbortController | undefined;
let mounted = false;

function canUpdate() {
  return mounted && !document.hidden && navigator.onLine;
}

function isFetching() {
  return status.value === "pending";
}

async function updateRequests() {
  if (!canUpdate() || liveRequest || isFetching()) return;
  const filters = query.value;
  const controller = new AbortController();
  liveRequest = controller;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 10_000);
  try {
    const updated = await $fetch<AdminRequestList>("/api/admin/requests", {
      query: filters, signal: controller.signal, retry: 0,
    });
    // A response for previous filters must never replace the current results.
    if (!canUpdate() || controller.signal.aborted || query.value !== filters || isFetching()) return;
    data.value = updated;
    error.value = undefined;
    status.value = "success";
    liveState.value = "live";
  } catch (failure) {
    if (!canUpdate() || query.value !== filters || (controller.signal.aborted && !timedOut)) return;
    if ((failure as { statusCode?: number }).statusCode === 401) {
      mounted = false;
      clearInterval(liveTimer);
      clearNuxtData((key) => key.startsWith("admin-"));
      await navigateTo("/admin/login", { replace: true });
      return;
    }
    // Keep the last successful list visible while the connection recovers.
    liveState.value = "reconnecting";
  } finally {
    clearTimeout(timeout);
    if (liveRequest === controller) liveRequest = undefined;
  }
}

function handleActivity() {
  if (!canUpdate()) {
    liveRequest?.abort();
    liveState.value = "paused";
  } else {
    void updateRequests();
  }
}

watch(query, () => { liveRequest?.abort(); });
onMounted(() => {
  mounted = true;
  liveState.value = canUpdate() ? "live" : "paused";
  liveTimer = setInterval(() => { void updateRequests(); }, 5000);
  document.addEventListener("visibilitychange", handleActivity);
  window.addEventListener("focus", handleActivity);
  window.addEventListener("online", handleActivity);
  window.addEventListener("offline", handleActivity);
});
onBeforeUnmount(() => {
  mounted = false;
  clearInterval(liveTimer);
  liveRequest?.abort();
  document.removeEventListener("visibilitychange", handleActivity);
  window.removeEventListener("focus", handleActivity);
  window.removeEventListener("online", handleActivity);
  window.removeEventListener("offline", handleActivity);
});

function applyFilters(nextSort = sort.value) {
  return router.push({ path: "/admin", query: { search: search.value.trim().toUpperCase() || undefined, sort: nextSort === "oldest" ? "oldest" : undefined } });
}
function changeSort(event: Event) {
  return applyFilters((event.target as HTMLSelectElement).value === "oldest" ? "oldest" : "newest");
}
function resetSearch() { search.value = ""; return applyFilters(); }
const pageLink = (page: number) => ({ path: "/admin", query: { ...route.query, page: String(page) } });
</script>

<template>
  <section>
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p class="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Request inbox</p><h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Quote requests</h1><p class="mt-2 text-muted-foreground">Review customer enquiries and their requested equipment.</p></div>
      <div class="flex flex-wrap items-center gap-4">
        <span v-if="liveState !== 'live'" role="status" class="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true" class="size-2 rounded-full bg-amber-500" />
          {{ liveState === 'paused' ? 'Updates paused' : 'Connection interrupted · retrying' }}
        </span>
        <span v-if="data && !error" class="rounded-full border border-border bg-card px-4 py-2 text-sm"><strong class="font-semibold">{{ data.total }}</strong> {{ activeSearch ? 'matching' : 'total' }} {{ data.total === 1 ? 'request' : 'requests' }}</span>
      </div>
    </div>
    <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div class="flex flex-col justify-between gap-5 border-b border-border p-5 sm:flex-row sm:items-end sm:p-6">
        <form class="w-full sm:max-w-md" role="search" @submit.prevent="applyFilters()">
          <label for="request-search" class="mb-2 block text-sm font-medium">Search by Request ID</label>
          <div class="flex gap-2"><Input id="request-search" v-model="search" type="search" placeholder="e.g. IND-323" maxlength="7" class="uppercase placeholder:normal-case" /><Button type="submit" class="h-11" aria-label="Search requests"><Search class="size-4" aria-hidden="true" /><span class="hidden sm:inline">Search</span></Button></div>
          <button v-if="activeSearch" type="button" class="mt-2 text-sm font-medium text-primary hover:underline" @click="resetSearch">Clear search</button>
        </form>
        <div class="sm:w-44"><label for="request-sort" class="mb-2 block text-sm font-medium">Sort by date</label><select id="request-sort" :value="sort" class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" @change="changeSort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
      </div>
      <div aria-live="polite" :aria-busy="status === 'pending'">
        <div v-if="error" class="px-6 py-16 text-center"><h2 class="text-lg font-semibold">Could not load requests</h2><p role="alert" class="mt-2 text-muted-foreground">{{ error.data?.statusMessage || 'Please try again.' }}</p><Button variant="outline" class="mt-5" @click="refresh()">Try again</Button></div>
        <p v-else-if="status === 'pending'" role="status" class="px-6 py-20 text-center text-muted-foreground">Loading requests…</p>
        <div v-else-if="!data?.requests.length" class="px-6 py-20 text-center"><Inbox class="mx-auto mb-4 size-10 text-muted-foreground" aria-hidden="true" /><h2 class="text-xl font-semibold">{{ activeSearch ? 'No matching request' : 'No requests yet' }}</h2><p class="mt-2 text-muted-foreground">{{ activeSearch ? 'Check the Request ID or clear your search.' : 'New quote requests will appear here when customers submit them.' }}</p><Button v-if="activeSearch" variant="outline" class="mt-5" @click="resetSearch">Clear search</Button></div>
        <div v-else class="relative overflow-x-auto">
          <table class="w-full text-left text-sm">
            <caption class="sr-only">Quote requests, sorted {{ sort === 'oldest' ? 'oldest' : 'newest' }} first. All dates are in Indian Standard Time.</caption>
            <thead class="border-b border-border bg-muted/60 text-muted-foreground"><tr><th scope="col" class="px-6 py-4 font-medium">Request ID</th><th scope="col" class="px-6 py-4 font-medium">Date · IST</th><th scope="col" class="px-6 py-4 font-medium">Customer</th><th scope="col" class="px-6 py-4 font-medium">Organisation</th><th scope="col" class="px-6 py-4 font-medium">Products</th><th scope="col" class="px-6 py-4"><span class="sr-only">View request</span></th></tr></thead>
            <tbody class="divide-y divide-border">
              <tr v-for="request in data.requests" :key="request.reference" class="transition-colors hover:bg-muted/40">
                <td class="whitespace-nowrap px-6 py-5"><NuxtLink :to="{ path: `/admin/requests/${request.reference}`, query: route.query }" class="font-semibold tracking-wide text-primary hover:underline">{{ request.reference }}</NuxtLink></td>
                <td class="whitespace-nowrap px-6 py-5 text-muted-foreground"><time :datetime="request.createdAt">{{ formatAdminDate(request.createdAt) }}</time></td>
                <td class="px-6 py-5 font-medium">{{ request.firstName }} {{ request.lastName }}</td><td class="px-6 py-5 text-muted-foreground">{{ request.organisation || '—' }}</td><td class="px-6 py-5">{{ request.itemCount }}</td>
                <td class="px-6 py-5"><NuxtLink :to="{ path: `/admin/requests/${request.reference}`, query: route.query }" class="inline-flex size-9 items-center justify-center rounded-md text-primary hover:bg-secondary" :aria-label="`View request ${request.reference}`"><ArrowRight class="size-4" aria-hidden="true" /></NuxtLink></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="data?.requests.length && !error && status !== 'pending'" class="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4 text-sm">
        <p class="text-muted-foreground">Showing {{ (data.page - 1) * data.pageSize + 1 }}–{{ Math.min(data.page * data.pageSize, data.total) }} of {{ data.total }}</p>
        <nav aria-label="Request pages" class="flex items-center gap-3"><Button v-if="data.page > 1" as="NuxtLink" :to="pageLink(data.page - 1)" variant="outline" size="sm"><ChevronLeft class="size-4" aria-hidden="true" /> Previous</Button><span class="text-muted-foreground">Page {{ data.page }} of {{ data.pages }}</span><Button v-if="data.page < data.pages" as="NuxtLink" :to="pageLink(data.page + 1)" variant="outline" size="sm">Next <ChevronRight class="size-4" aria-hidden="true" /></Button></nav>
      </div>
    </div>
  </section>
</template>
