import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { fetchInquiries } from "../api";

export default function FailedLeads() {
  const [inquiries, setInquiries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInquiries("failed");
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

  return (
    <AppLayout
      title="Failed Leads"
      subtitle="Approved inquiries that did not close successfully"
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
                <th>Reason</th>
                <th>Marked unsuccessful</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>{inquiry.client_name}</td>
                  <td>{inquiry.unsuccessful_reason || "—"}</td>
                  <td>
                    {inquiry.outcome_at
                      ? new Date(inquiry.outcome_at).toLocaleString("id-ID")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No failed leads yet.</p>
        )}
      </section>
    </AppLayout>
  );
}
