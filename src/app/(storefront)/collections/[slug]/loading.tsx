export default function CollectionLoading() {
  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-site items-center justify-center px-4 py-6 sm:px-6"
      aria-busy="true"
    >
      <div
        role="status"
        className="flex flex-col items-center gap-3 text-sm text-muted"
      >
        <span
          aria-hidden="true"
          className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-maroon"
        />
        <span>Loading products...</span>
      </div>
    </div>
  );
}
