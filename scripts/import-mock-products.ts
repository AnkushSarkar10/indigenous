import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { load } from "cheerio";
import robotsParser from "robots-parser";

const SOURCE_ORIGIN = "https://rz-medizintechnik.com";
const DEFAULT_OUTPUT = "mock-products.json";
const REQUEST_DELAY_MS = 800;
const IMPORTER_USER_AGENT = "IndigenousMockCatalogImporter/1.0";

const CATEGORY_PAGES = [
  ["Cystoscopy", "/en/product-portfolio/endourology/cystoscopy/"],
  [
    "Transurethral Resection",
    "/en/product-portfolio/endourology/transurethral-resection-of-the-prostate-turp/",
  ],
  ["Laser Enucleation", "/en/product-portfolio/endourology/laser-enucleation/"],
  [
    "Stone Management",
    "/en/product-portfolio/endourology/stone-management-in-the-urological-system/",
  ],
  ["Laparoscopic Urology", "/en/product-portfolio/endourology/laparoscopic-urology/"],
  ["Paediatric Urology", "/en/product-portfolio/endourology/pediatric-urology/"],
] as const;

type SourceCandidate = {
  sourceName: string;
  description: string;
  sourcePage: string;
  referenceImageUrl: string;
};

type MockProduct = {
  sku: string;
  name: string;
  specialty: string;
  category: string;
  description: string;
  imageUrl: string;
  specifications: Record<string, never>;
  isAvailable: boolean;
};

const args = new Set(process.argv.slice(2));
const shouldCommit = args.has("--commit");
const shouldSkipRobots = args.has("--skip-robots");
const outputArgIndex = process.argv.indexOf("--output");
const outputPath = resolve(
  outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] || DEFAULT_OUTPUT : DEFAULT_OUTPUT,
);

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function absoluteUrl(value: string, pageUrl: string) {
  return new URL(value, pageUrl).toString();
}

function imageSource(element: import("cheerio").Cheerio<unknown>, pageUrl: string) {
  const srcset = element.attr("data-srcset") || element.attr("srcset");
  const largestSrcsetImage = srcset
    ?.split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean)
    .at(-1);

  const src =
    largestSrcsetImage ||
    element.attr("data-lazy-src") ||
    element.attr("data-src") ||
    element.attr("src");

  return src ? absoluteUrl(src, pageUrl) : null;
}

function isProductImage(alt: string, url: string) {
  const ignoredText =
    /\b(image|logo|search|language|menu|arrow|icon|retailer|contact|newsletter)\b|do you have any questions|product (highlights|details)/i;
  const ignoredUrl = /logo|icon|favicon|newsletter|footer|header|language|search|user\.svg/i;
  const isRasterImage = /\.(avif|jpe?g|png|webp)(?:\?|$)/i.test(url);

  return (
    alt.length >= 5 && isRasterImage && !ignoredText.test(alt) && !ignoredUrl.test(url)
  );
}

function nearbyHeading(
  element: import("cheerio").Cheerio<unknown>,
  $: ReturnType<typeof load>,
) {
  let container = element.parent();

  for (let depth = 0; depth < 6 && container.length; depth += 1) {
    const headings = container.find("h2, h3, h4, h5");
    if (headings.length) {
      return cleanText($(headings[headings.length - 1]).text());
    }
    container = container.parent();
  }

  return "";
}

function productLabel(
  element: import("cheerio").Cheerio<unknown>,
  $: ReturnType<typeof load>,
) {
  const wrapperText = cleanText(element.closest(".regular-images").text());
  const title = element
    .closest(".elementor-accordion-item")
    .find(".elementor-tab-title, .elementor-accordion-title")
    .first()
    .clone();
  title.find("svg, style, script").remove();
  const accordionTitle = cleanText(title.text());

  return wrapperText || accordionTitle || nearbyHeading(element, $);
}

function productDescription(element: import("cheerio").Cheerio<unknown>) {
  const details = element.closest(".elementor-tab-content").clone();
  if (!details.length) return "";

  details
    .find(
      ".produt-details-images, .product-details-images, img, svg, a, button, script, style",
    )
    .remove();
  details.find("p, li, h1, h2, h3, h4, h5, br").append(" ");

  return cleanText(details.text());
}

function extractCandidates(html: string, pageUrl: string): SourceCandidate[] {
  const $ = load(html);
  const candidates = new Map<string, SourceCandidate>();

  $("img").each((_, image) => {
    const element = $(image);
    const alt = cleanText(element.attr("alt") || "");
    const sourceName = alt || productLabel(element, $);
    const description = productDescription(element);
    const referenceImageUrl = imageSource(element, pageUrl);

    if (
      !description ||
      !referenceImageUrl ||
      !isProductImage(sourceName, referenceImageUrl)
    ) {
      return;
    }

    const key = `${sourceName.toLocaleLowerCase()}|${referenceImageUrl}`;
    candidates.set(key, {
      sourceName,
      description,
      sourcePage: pageUrl,
      referenceImageUrl,
    });
  });

  return [...candidates.values()];
}

function categoryCode(category: string) {
  return category.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
}

function createMockProduct(
  candidate: SourceCandidate,
  category: string,
  index: number,
): MockProduct {
  const sequence = String(index + 1).padStart(3, "0");
  const sku = `MOCK-${categoryCode(category)}-${sequence}`;

  return {
    sku,
    name: candidate.sourceName,
    specialty: "Urology",
    category,
    description: candidate.description,
    imageUrl: candidate.referenceImageUrl,
    specifications: {},
    isAvailable: sku !== "MOCK-CYS-001",
  };
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": `${IMPORTER_USER_AGENT} (review-only; low-rate)`,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

async function assertRobotsAllowsImport() {
  const robotsUrl = new URL("/robots.txt", SOURCE_ORIGIN).toString();
  const robots = robotsParser(robotsUrl, await fetchText(robotsUrl));
  const blockedPage = CATEGORY_PAGES.map(([, pathname]) =>
    new URL(pathname, SOURCE_ORIGIN).toString(),
  ).find(
    (pageUrl) => robots.isAllowed(pageUrl, IMPORTER_USER_AGENT) === false,
  );

  if (blockedPage) {
    throw new Error(`${robotsUrl} disallows scraping ${blockedPage}`);
  }
}

async function scrapeMockProducts() {
  const products: MockProduct[] = [];

  for (const [category, pathname] of CATEGORY_PAGES) {
    const pageUrl = new URL(pathname, SOURCE_ORIGIN).toString();
    console.log(`Fetching ${category}: ${pageUrl}`);
    const html = await fetchText(pageUrl);
    const candidates = extractCandidates(html, pageUrl);

    products.push(
      ...candidates.map((candidate, index) => createMockProduct(candidate, category, index)),
    );

    await delay(REQUEST_DELAY_MS);
  }

  return products;
}

async function writePreview(products: MockProduct[]) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  console.log(`Wrote ${products.length} review records to ${outputPath}`);
}

async function commitProducts(products: MockProduct[]) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required with --commit");

  const databaseUrl = new URL(connectionString);
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname);
  if (!isLoopback) databaseUrl.searchParams.set("sslmode", "verify-full");

  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("../prisma/generated/client.ts"),
  ]);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl.toString(),
      connectionTimeoutMillis: 20_000,
    }),
  });

  try {
    for (const product of products) {
      await prisma.product.upsert({
        where: { sku: product.sku },
        create: product,
        update: product,
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Upserted ${products.length} mock products.`);
}

async function main() {
  if (!shouldSkipRobots) await assertRobotsAllowsImport();

  const products = await scrapeMockProducts();
  await writePreview(products);

  if (shouldCommit) {
    await commitProducts(products);
  } else {
    console.log("Review the JSON, then rerun with --commit to write to the database.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
