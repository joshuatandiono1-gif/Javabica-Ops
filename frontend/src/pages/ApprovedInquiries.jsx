import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { fetchInquiries, updateInquiryOutcome } from "../api";

export default function ApprovedInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [failModal, setFailModal] = useState(null);
  const [failReason, setFailReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInquiries("approved");
      setInquiries(data.inquiries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  async function handleSuccessful(inquiryId) {
    setError("");
    setSubmitting(true);
    try {
      await updateInquiryOutcome(inquiryId, "successful");
      await loadInquiries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnsuccessful(e) {
    e.preventDefault();
    if (!failModal) return;

    setError("");
    setSubmitting(true);
    try {
      await updateInquiryOutcome(failModal, "unsuccessful", failReason);
      setFailModal(null);
      setFailReason("");
      await loadInquiries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout
      title="Approved Inquiries"
      subtitle="Mark deals as successful or unsuccessful after follow-up"
    >
      {error && <p className="error banner-error">{error}</p>}

      <section className="card">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : inquiries.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Created</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>{inquiry.client_name}</td>
                  <td>
                    <span className="status-badge approved">Approved</span>
                  </td>
                  <td>{new Date(inquiry.created_at).toLocaleString("id-ID")}</td>
                  <td>
                    <div className="outcome-actions">
                      <button
                        type="button"
                        className="outcome-btn success"
                        title="Successful"
                        disabled={submitting}
                        onClick={() => handleSuccessful(inquiry.id)}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="outcome-btn fail"
                        title="Not successful"
                        disabled={submitting}
                        onClick={() => {
                          setFailModal(inquiry.id);
                          setFailReason("");
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No approved inquiries awaiting outcome.</p>
        )}
      </section>

      {failModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Mark as unsuccessful</h2>
            <p className="section-desc">Please provide a reason why this lead failed.</p>
            <form onSubmit={handleUnsuccessful}>
              <label className="stack-label">
                Reason
                <textarea
                  rows={4}
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  placeholder="Explain why the deal was unsuccessful..."
                  required
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setFailModal(null);
                    setFailReason("");
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Confirm unsuccessful"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
