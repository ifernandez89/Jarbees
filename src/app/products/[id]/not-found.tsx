import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-2xl font-bold mb-4">Not Found</h2>
      <p className="text-gray-600 mb-4">
        Could not find requested product
      </p>
      <Link href="/" className={buttonVariants()}>
        Return Home
      </Link>
    </div>
  );
}
