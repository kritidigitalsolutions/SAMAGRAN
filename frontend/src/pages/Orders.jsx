import Table from "../components/Table";

const data = [
  { name: "Rudrabhishek Kit", price: "Rs 2,500" },
  { name: "Satyanarayan Pooja", price: "Rs 4,200" },
  { name: "Festival Combo Box", price: "Rs 1,850" },
];

export default function Orders() {
  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Orders</p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Booking and order management</h2>
        <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/70">Review recent bookings, kit purchases, and service orders.</p>
      </section>

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <h3 className="mb-4 text-lg font-semibold text-[#2f1618] dark:text-[#fff3dc]">Recent orders</h3>
        <Table data={data} />
      </section>
    </div>
  );
}


