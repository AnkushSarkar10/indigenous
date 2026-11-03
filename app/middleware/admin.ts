export default defineNuxtRouteMiddleware(async (to) => {
  try {
    await useRequestFetch()("/api/admin/session");
    if (to.path === "/admin/login") return navigateTo("/admin", { replace: true });
  } catch {
    if (to.path !== "/admin/login") return navigateTo("/admin/login", { replace: true });
  }
});
