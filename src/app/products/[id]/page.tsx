import ProductPageClient from "./ProductPageClient";

// For `output: 'export'` Next requires dynamic routes to export a
// `generateStaticParams`. Returning an empty array ensures the app can be
// exported without prebuilding any product pages (client-side fetch at runtime).
export async function generateStaticParams() {
  return [{ id: '1' }];
}

// Server wrapper: simply forwards `params` to the client component.
// This file must be a server component (no `use client`) so it can export
// `generateStaticParams()` without conflict.
export default function Page({ params }: { params?: Promise<{ id?: string }> | undefined }) {
  return <ProductPageClient params={params} />;
}
