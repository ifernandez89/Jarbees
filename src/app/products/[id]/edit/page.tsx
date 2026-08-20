import ProductEditClient from "./ProductEditClient";

export async function generateStaticParams() {
  return [{ id: '1' }];
}

export default function Page({ params }: { params?: Promise<{ id?: string }> | undefined }) {
  return <ProductEditClient params={params} />;
}
