import Table from "../components/Table";
import "./Orders.css";

const data = [
  { name: "Rudrabhishek Kit", price: "Rs 2,500" },
  { name: "Satyanarayan Pooja", price: "Rs 4,200" },
  { name: "Festival Combo Box", price: "Rs 1,850" },
];

export default function Orders() {
  return (
    <div className="orders-page">
      <section className="orders-page__panel">
        <p className="orders-page__eyebrow">Orders</p>
        <h2 className="orders-page__title">Booking and order management</h2>
        <p className="orders-page__subtitle">Review recent bookings, kit purchases, and service orders.</p>
      </section>

      <section className="orders-page__panel">
        <h3 className="orders-page__section-title">Recent orders</h3>
        <Table data={data} />
      </section>
    </div>
  );
}
