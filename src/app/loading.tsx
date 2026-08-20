export default function Loading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-48 bg-gray-200 animate-pulse rounded-lg"
        />
      ))}
    </div>
  );
}
