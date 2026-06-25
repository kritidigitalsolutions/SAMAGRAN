import { useEffect, useState } from "react";
import API from "../api/axios";

const initialForm = {
  price: "",
  panditCommissionPercent: "",
  panditCommissionThreshold: "",
  minRecommendationPriceForCommission: "",
  freeDeliveryThreshold: "",
};

export default function BookingPricing() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPricing = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/booking-price/price");
      const data = res.data?.data || res.data || {};

      setForm({
        price: data.price ?? "",
        panditCommissionPercent: data.panditCommissionPercent ?? 0,
        panditCommissionThreshold: data.panditCommissionThreshold ?? 500,
        minRecommendationPriceForCommission: data.minRecommendationPriceForCommission ?? 0,
        freeDeliveryThreshold: data.freeDeliveryThreshold ?? 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load booking pricing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      price: Number(form.price),
      panditCommissionPercent: Number(form.panditCommissionPercent),
      panditCommissionThreshold: Number(form.panditCommissionThreshold),
      minRecommendationPriceForCommission: Number(form.minRecommendationPriceForCommission),
      freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
    };

    try {
      await API.post("/admin/booking-price/price", payload);
      setSuccess("Booking pricing updated");
      await loadPricing();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update booking pricing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
          Booking Pricing
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          Pandit Booking & Commission
        </h2>
        <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
          Update booking price and pandit commission settings.
        </p>
      </section>

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        {loading ? (
          <p className="text-sm text-[var(--admin-text-muted)]">Loading settings...</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm font-semibold text-[var(--admin-text)]">
                Pandit Booking Charge (INR)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-3 text-sm"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-[var(--admin-text)]">
                Pandit Commission (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  name="panditCommissionPercent"
                  value={form.panditCommissionPercent}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-3 text-sm"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-[var(--admin-text)]">
                Pandit Withdrawal Threshold (INR)
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="panditCommissionThreshold"
                  value={form.panditCommissionThreshold}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-3 text-sm"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-[var(--admin-text)]">
                Pandit  Min Recommendation Price for Commission (INR)
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="minRecommendationPriceForCommission"
                  value={form.minRecommendationPriceForCommission}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-3 text-sm"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-[var(--admin-text)]">
                Free Delivery Product Order Limit (INR)
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="freeDeliveryThreshold"
                  value={form.freeDeliveryThreshold}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-3 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="admin-btn-primary rounded-2xl px-6 py-3 text-sm font-semibold"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
