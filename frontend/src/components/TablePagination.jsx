export default function TablePagination({
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
  showPageSize = true,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[var(--admin-muted)]">
        Showing {start} - {end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-[var(--admin-border)] text-black dark:text-white px-2.5 py-1.5 text-xs "
        >
          <span className="opacity-30 hover:opacity-100 cursor-pointer transition-all duration-200">Prev</span>
        </button>
        <span className="text-xs text-[var(--admin-text)]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-[var(--admin-border)]  text-black dark:text-white px-2.5 py-1.5 text-xs "
        >
          <span className="opacity-30 hover:opacity-100 cursor-pointer transition-all duration-200">Next</span>
        </button>
        {showPageSize && (
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-[var(--admin-border)]  text-black dark:text-white bg-[var(--admin-surface)] px-2 text-xs"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
