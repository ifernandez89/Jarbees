"use client";

import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">
        {error.message || "An error occurred while loading the page."}
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className={buttonVariants()}
        >
          Try again
        </button>
        <Link href="/" className={buttonVariants()}>
          Go home
        </Link>
      </div>
    </div>
  );
}
