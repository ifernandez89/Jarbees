"use client";

import React, { useEffect, useState } from "react";
import ProductDetailContainer from "@/components/products/ProductDetailsContainer";
import { getProduct } from "@/app/services/products.api";
import { Product } from "@/components/products/models/Product";

// Client component: fetches product at runtime. Receives `params` from the
// server wrapper (or a Promise when Next provides it).
type ClientProps = { params?: unknown };

export default function ProductPageClient({ params }: ClientProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-id">("loading");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setStatus("loading");
      const p = params;
      let resolvedParams: { id?: string } | undefined;
      try {
        if (p === undefined) {
          setStatus("no-id");
          return;
        }
        if (typeof (p as { then?: unknown })?.then === "function") {
          resolvedParams = await p as { id?: string };
        } else {
          resolvedParams = p as { id?: string } | undefined;
        }
      } catch (err) {
        console.error("Error resolving params:", err);
        setStatus("no-id");
        return;
      }

      const id = resolvedParams?.id;
      if (!id) {
        setStatus("no-id");
        return;
      }

      try {
        const fetched = await getProduct(id);
        if (!mounted) return;
        setProduct(fetched as Product);
        setStatus("ready");
      } catch (err: unknown) {
        console.error("Client fetch product error:", err);
        if (!mounted) return;
        setStatus("error");
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [params]);

  if (status === "loading") return <div className="p-6">Cargando producto…</div>;
  if (status === "no-id") return <div className="p-6">ID no proporcionado.</div>;
  if (status === "error") return <div className="p-6">JarBees desconectado — no se puede cargar el producto.</div>;

  return <ProductDetailContainer title="Detalles" product={product ?? undefined} />;
}
