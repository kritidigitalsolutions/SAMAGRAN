export default function Table({ data }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">

      <table className="w-full">

        <thead className="bg-[var(--admin-surface-soft)]">
          <tr>
            <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">Name</th>
            <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">Price</th>
            <th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)]/70">

              <td className="p-4 text-sm text-[var(--admin-text)]">{item.name}</td>
              <td className="p-4 text-sm font-semibold text-[var(--admin-text)]">{item.price}</td>

              <td className="space-x-2 p-4">
                <button className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-1 text-sm text-[var(--admin-text)]">Edit</button>
                <button className="rounded-xl bg-[var(--admin-primary)] px-3 py-1 text-sm text-white">Delete</button>
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}