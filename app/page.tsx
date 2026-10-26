"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const SHEET_CSV_URL =
  process.env.NEXT_PUBLIC_INVENTORY_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_Qm1JIodhWYmKcBTZ83-cymTMMzjsIa1piuPzeqy47pMHQHu8WUr9jTAY3OxETb32h98xhKwavm7n/pub?gid=1720042712&single=true&output=csv";
const CATEGORIES = ["All", "Kurti", "Jeans", "Leggings", "Suit Set", "Other"] as const;
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

type Category = (typeof CATEGORIES)[number];
type Size = (typeof SIZES)[number];

type Product = {
  id: string;
  title: string;
  category: Exclude<Category, "All">;
  price: number;
  images: string[];
  stock: Record<Size, number>;
};

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (character === '"') {
      if (inQuotes && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error("The inventory CSV contains an unclosed quoted field.");
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function parseInventory(csv: string): Product[] {
  const [headerRow, ...dataRows] = parseCsv(csv);
  if (!headerRow) throw new Error("The inventory CSV is empty.");

  const headers = headerRow.map((header) =>
    header.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/_/g, ""),
  );
  const requiredHeaders = [
    "title",
    "category",
    "price",
    "image1",
    "image2",
    "image3",
    "image4",
    "stocks",
    "stockm",
    "stockl",
    "stockxl",
    "stockxxl",
  ];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`The inventory CSV is missing columns: ${missingHeaders.join(", ")}.`);
  }

  const column = (row: string[], name: string) =>
    row[headers.indexOf(name.toLowerCase().replace(/_/g, ""))]?.trim() ?? "";
  const stockValue = (value: string, size: Size, rowNumber: number) => {
    if (value === "") return 0;
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(`Invalid stock quantity for size ${size} on CSV row ${rowNumber}.`);
    }
    return quantity;
  };

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const timestamp = column(row, "timestamp");
    const id = column(row, "id") || (timestamp ? `${timestamp}-${rowNumber}` : `row-${rowNumber}`);
    const title = column(row, "title");
    const categoryText = column(row, "category");
    const matchedCategory = CATEGORIES.find(
      (item) =>
        item.toLowerCase() === categoryText.toLowerCase() ||
        (item === "Kurti" && categoryText.toLowerCase() === "kurtie"),
    );
    const category: Product["category"] =
      matchedCategory && matchedCategory !== "All" ? matchedCategory : "Other";
    const priceText = column(row, "price").replace(/[,\s₹$]/g, "");
    const price = Number(priceText);

    if (!id || !title || !categoryText) {
      throw new Error(`The inventory CSV has a missing id, title, or category on row ${rowNumber}.`);
    }
    if (priceText === "" || !Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price on inventory CSV row ${rowNumber}.`);
    }

    return {
      id,
      title,
      category,
      price,
      images: ["image_1", "image_2", "image_3", "image_4"].map((name) =>
        column(row, name),
      ),
      stock: {
        S: stockValue(column(row, "stock_s"), "S", rowNumber),
        M: stockValue(column(row, "stock_m"), "M", rowNumber),
        L: stockValue(column(row, "stock_l"), "L", rowNumber),
        XL: stockValue(column(row, "stock_xl"), "XL", rowNumber),
        XXL: stockValue(column(row, "stock_xxl"), "XXL", rowNumber),
      },
    };
  });
}

function getDisplayImageUrl(src: string): string {
  try {
    const url = new URL(src);
    if (url.hostname === "drive.google.com") {
      const fileId =
        url.searchParams.get("id") ?? url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
      }
    }
  } catch {
    return src;
  }

  return src;
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getDisplayImageUrl(src);

  if (!imageUrl || failed) {
    return (
      <div className="flex aspect-square items-center justify-center bg-stone-100 text-xs text-stone-400">
        No image
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={400}
      height={400}
      unoptimized
      loading="lazy"
      className="aspect-square h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadInventory() {
      try {
        const csvUrl = new URL(SHEET_CSV_URL);
        csvUrl.searchParams.set("_refresh", Date.now().toString());
        const response = await fetch(csvUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`The inventory sheet could not be loaded (HTTP ${response.status}).`);
        }
        setProducts(parseInventory(await response.text()));
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The inventory sheet could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadInventory();
    return () => controller.abort();
  }, []);

  const filteredProducts = useMemo(
    () =>
      selectedCategory === "All"
        ? products
        : products.filter((product) => product.category === selectedCategory),
    [products, selectedCategory],
  );

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">
              Payal Collection
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Collection</h1>
            <p className="mt-2 text-stone-600">Find your next favorite outfit.</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800"
          >
            Admin Login
          </Link>
        </header>

        <nav aria-label="Filter products by category" className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategory === category
                  ? "bg-rose-700 text-white"
                  : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-rose-50"
              }`}
            >
              {category}
            </button>
          ))}
        </nav>

        {loading ? (
          <p role="status" className="py-16 text-center text-stone-600">
            Loading inventory...
          </p>
        ) : error ? (
          <p role="alert" className="rounded-lg bg-red-50 p-4 text-center text-red-800">
            {error}
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="py-16 text-center text-stone-600">No products found in this category.</p>
        ) : (
          <section
            aria-label="Products"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200"
              >
                <div className="grid grid-cols-2 gap-1 bg-stone-100">
                  {product.images.map((image, index) => (
                    <ProductImage
                      key={`${product.id}-${index}`}
                      src={image}
                      alt={`${product.title}, image ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                        {product.category}
                      </p>
                      <h2 className="mt-1 font-semibold">{product.title}</h2>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 2,
                      }).format(product.price)}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Size availability">
                    {SIZES.map((size) => {
                      const soldOut = product.stock[size] === 0;
                      return (
                        <span
                          key={size}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                            soldOut
                              ? "border-stone-200 bg-stone-100 text-stone-500"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                          aria-label={
                            soldOut
                              ? `Size ${size}: out of stock`
                              : `Size ${size}: ${product.stock[size]} available`
                          }
                        >
                          <span className={soldOut ? "line-through" : ""}>{size}</span>
                          {soldOut ? "Out of Stock" : `(${product.stock[size]})`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
