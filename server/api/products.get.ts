import { prisma } from "../utils/db";

export default defineEventHandler(async () => {
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return products.map((product) => ({
    ...product,
    id: product.id.toString(),
  }));
});
