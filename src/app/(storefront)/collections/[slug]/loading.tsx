export default function CollectionLoading() {
  return (
    <div className="mx-auto max-w-site px-4 py-6 sm:px-6" aria-busy="true">
      <p role="status" className="mb-6 text-sm text-muted">Loading products...</p>
      <div aria-hidden="true" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index}>
            <div className="aspect-[3/4] animate-pulse rounded-sm bg-line" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded-sm bg-line" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded-sm bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}