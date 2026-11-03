import { defineEventHandler, getQuery } from "h3";
import { prisma } from "../../../utils/db";
import { ADMIN_PAGE_SIZE, adminRequestQuery } from "../../../utils/admin-requests";

export default defineEventHandler(async (event) => {
  const query = adminRequestQuery(getQuery(event));
  const where = query.search ? { reference: { contains: query.search } } : {};
  const total = await prisma.quoteRequest.count({ where });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const direction = query.sort === "oldest" ? "asc" : "desc";
  const requests = await prisma.quoteRequest.findMany({
    where,
    orderBy: [{ createdAt: direction }, { id: direction }],
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
    select: { reference: true, createdAt: true, firstName: true, lastName: true, organisation: true, _count: { select: { items: true } } },
  });
  return { requests: requests.map(({ _count, createdAt, ...request }) => ({ ...request, createdAt: createdAt.toISOString(), itemCount: _count.items })), total, page, pages, pageSize: ADMIN_PAGE_SIZE };
});
