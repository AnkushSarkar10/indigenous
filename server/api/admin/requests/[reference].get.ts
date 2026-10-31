import { createError, defineEventHandler, getRouterParam } from "h3";
import { prisma } from "../../../utils/db";
import { adminRequestReference } from "../../../utils/admin-requests";

export default defineEventHandler(async (event) => {
  const reference = adminRequestReference(getRouterParam(event, "reference"));
  const request = await prisma.quoteRequest.findUnique({
    where: { reference },
    select: {
      reference: true, createdAt: true, firstName: true, lastName: true, organisation: true,
      email: true, contactNumber: true, address: true, notes: true,
      items: { orderBy: { id: "asc" }, select: { skuSnapshot: true, nameSnapshot: true, quantity: true } },
    },
  });
  if (!request) throw createError({ statusCode: 404, statusMessage: "Request not found." });
  return { ...request, createdAt: request.createdAt.toISOString() };
});
