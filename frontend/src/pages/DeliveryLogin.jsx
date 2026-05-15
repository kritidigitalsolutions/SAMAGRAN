import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DeliveryAPI from "../api/deliveryAxios";
import { setDeliverySession } from "../utils/deliveryAuth";

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const defaultPhone = searchParams.get("phone");
    if (defaultPhone) {
      setPhone(defaultPhone);
    }
  }, [searchParams]);

  const handleSendOtp = async (event) => {
    event.preventDefault();

    if (!phone.trim()) {
      setError("Phone number is required.");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await DeliveryAPI.post("/delivery/auth/send-otp", {
        phone: phone.trim(),
      });

      setStep("otp");
      setSuccess(res.data?.message || "OTP sent to your phone.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (!phone.trim() || !otp.trim()) {
      setError("Phone and OTP are required.");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await DeliveryAPI.post("/delivery/auth/verify-otp", {
        phone: phone.trim(),
        otp: otp.trim(),
      });

      const token = res.data?.data?.token;
      const deliveryBoy = res.data?.data?.deliveryBoy;

      if (!token) {
        throw new Error("Token missing");
      }

      setDeliverySession(token, deliveryBoy);
      setSuccess("Login successful.");
      navigate("/delivery", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff3dd_0%,_#f6efe4_35%,_#f5f1ea_70%)] px-4 py-10 text-[#2f1618]">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-[#e5d2b8] bg-white/90 p-6 shadow-[0_18px_50px_rgba(36,18,10,0.12)]">
          <div className="mb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8B1E3F]">Delivery</p>
            <h1 className="mt-2 text-2xl font-bold">Delivery Login</h1>
            <p className="mt-2 text-sm text-[#6e4b40]">
              OTP se login karo aur assigned orders update karo.
            </p>
          </div>

          {(error || success) && (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                error
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || success}
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="10 digit phone"
                  className="w-full rounded-2xl border border-[#dcc7ab] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B1E3F]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#8B1E3F] px-4 py-3 text-sm font-semibold text-white shadow disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-2xl border border-[#f0e3d1] bg-[#fff9ef] px-4 py-3 text-xs text-[#7b5a4b]">
                OTP sent to <span className="font-semibold">{phone}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6 digit OTP"
                  className="w-full rounded-2xl border border-[#dcc7ab] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B1E3F]"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                    setSuccess("");
                  }}
                  className="flex-1 rounded-2xl border border-[#d7bf9b] px-4 py-3 text-sm font-semibold text-[#6f3945]"
                >
                  Change Phone
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-[#8B1E3F] px-4 py-3 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
