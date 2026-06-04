import { useEffect, useState } from "react";
import API from "../api/axios";

const legalTypes = [
  { id: "privacy", label: "Privacy Policy" },
  { id: "term", label: "Term and Conditions" },
  { id: "refund", label: "Refund Policy" },
  { id: "about", label: "About Us" },
];

export default function Legal() {
  const [activeTab, setActiveTab] = useState("privacy");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentType = legalTypes.find((t) => t.id === activeTab);

  const fetchLegal = async (type) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const res = await API.get(`/legal/${type}`);
      setContent(res.data?.legal?.content || "");
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || "Unable to load content.");
      }
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegal(activeTab);
  }, [activeTab]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!content.trim()) {
      setError("Content cannot be empty.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await API.post(`/legal/${activeTab}`, {
        content: content.trim(),
      });

      setSuccess("Content updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save content.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      {/* Tabs */}
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap gap-2">
          {legalTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={`rounded-2xl px-6 py-3 font-medium transition-all ${
                activeTab === type.id
                  ? "admin-btn-primary border-transparent text-white"
                  : "border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-surface-soft)]"
              }`}
            >
              <span className="mr-2">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {/* Content Editor */}
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <h2 className="mb-6 text-2xl font-bold">
          {currentType?.icon} {currentType?.label}
        </h2>

        {error && (
          <div className="mb-4 rounded-xl bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-green-100 p-4 text-green-800 dark:bg-green-900 dark:text-green-200">
            {success}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center">Loading content...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-3 block font-medium">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Enter ${currentType?.label.toLowerCase()} content here...`}
                rows="15"
                className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-3 font-mono text-sm"
              />
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {content.length} characters
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn-primary flex-1 rounded-2xl border border-transparent px-4 py-2 font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Content"}
              </button>
              <button
                type="button"
                onClick={() => fetchLegal(activeTab)}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-[var(--admin-border)] px-4 py-2 font-medium transition-all hover:bg-[var(--admin-surface-soft)]"
              >
                Discard Changes
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Info Card */}
      {/* <section className="rounded-3xl border border-[var(--admin-border)] bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6">
        <h3 className="mb-3 font-bold text-blue-600 dark:text-blue-400">ℹ️ Tips for Content</h3>
        <ul className="space-y-2 text-sm">
          <li>• Keep the content clear and concise</li>
          <li>• Use proper formatting and structure</li>
          <li>• Ensure legal compliance with regulations</li>
          <li>• Review content before publishing</li>
          <li>• Update regularly as needed</li>
        </ul>
      </section> */}
    </div>
  );
}
