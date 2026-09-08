import type { Product as PrismaProduct } from "../prisma/generated/browser";

/** Product as serialized by the products API. */
export type Product = Omit<PrismaProduct, "id"> & {
  id: string;
};
