import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { createInquiry, fetchMachines, fetchProducts } from "../api";

export default function InvestmentCalculator() {
  const [products, setProducts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machineQty, setMachineQty] = useState({});
  const [monthlyOrders, setMonthlyOrders] = useState({});
  const [pricesPerKg, setPricesPerKg] = useState({});
  const [clientName, setClientName] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productsData, machinesData] = await Promise.all([
        fetchProducts(),
        fetchMachines(),
      ]);
      setProducts(productsData.products);
      setMachines(machinesData.machines);

      setMachineQty((prev) => {
        const qty = {};
        machinesData.machines.forEach((machine) => {
          qty[machine.id] = prev[machine.id] ?? "";
        });
        return qty;
      });

      setMonthlyOrders((prev) => {
        const orders = {};
        productsData.products.forEach((product) => {
          orders[product.id] = prev[product.id] ?? "";
        });
        return orders;
      });

      setPricesPerKg((prev) => {
        const prices = {};
        productsData.products.forEach((product) => {
          prices[product.id] = prev[product.id] ?? "";
        });
        return prices;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function buildPayload() {
    const selected_machines = {};
    machines.forEach((machine) => {
      const qty = Number(machineQty[machine.id]) || 0;
      if (qty > 0) selected_machines[machine.id] = qty;
    });

    const monthly_orders = {};
    const prices_per_kg = {};
    products.forEach((product) => {
      monthly_orders[product.id] = Number(monthlyOrders[product.id]) || 0;
      prices_per_kg[product.id] =
        pricesPerKg[product.id] === ""
          ? 0
          : Number(pricesPerKg[product.id]) || 0;
    });

    return {
      client_name: clientName,
      selected_machines,
      monthly_orders,
      prices_per_kg,
    };
  }

  async function handleGenerateInquiry(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const data = await createInquiry(buildPayload());
      setResult(data.inquiry);
      const statusLabel =
        data.inquiry.approval_status === "approved" ? "Approved" : "Rejected";
      setSuccess(`Inquiry for ${data.inquiry.client_name}: ${statusLabel}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout
      title="New Inquiry"
      subtitle="Select machines, set MOQ and selling prices, then submit for review"
    >
      {error && <p className="error banner-error">{error}</p>}
      {success && <p className="success banner-success">{success}</p>}

      <form onSubmit={handleGenerateInquiry}>
        <section className="card">
          <h2>Client</h2>
          <label className="stack-label">
            Client name
            <input
              type="text"
              placeholder="e.g. PT Kopi Nusantara"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>
        </section>

        <section className="card">
          <h2>Select Machines</h2>
          <p className="section-desc">
            Choose how many of each machine are included in this deal.
          </p>

          {loading ? (
            <p className="muted">Loading machines...</p>
          ) : machines.length > 0 ? (
            <div className="machine-grid">
              {machines.map((machine) => (
                <div key={machine.id} className="deal-card">
                  <h3>{machine.name}</h3>
                  <label className="stack-label">
                    Quantity
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={machineQty[machine.id] ?? ""}
                      onChange={(e) =>
                        setMachineQty({ ...machineQty, [machine.id]: e.target.value })
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No machines in catalog yet. Ask an admin to add them.</p>
          )}
        </section>

        <section className="card">
          <h2>Coffee Products</h2>
          <p className="section-desc">
            Enter MOQ (kg/month) and your selling price per kg for this client.
          </p>

          {loading ? (
            <p className="muted">Loading products...</p>
          ) : products.length > 0 ? (
            <div className="deal-grid">
              {products.map((product) => (
                <div key={product.id} className="deal-card">
                  <h3>{product.name}</h3>
                  <div className="deal-inputs">
                    <label>
                      Selling price / kg (IDR)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={pricesPerKg[product.id] ?? ""}
                        onChange={(e) =>
                          setPricesPerKg({
                            ...pricesPerKg,
                            [product.id]: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      MOQ (kg / month)
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={monthlyOrders[product.id] ?? ""}
                        onChange={(e) =>
                          setMonthlyOrders({
                            ...monthlyOrders,
                            [product.id]: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No coffee products in catalog yet.</p>
          )}
        </section>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Generate Inquiry"}
        </button>
      </form>

      {result && (
        <section className="card result-card">
          <h2>Inquiry Result</h2>
          <div className="status-result">
            <span
              className={
                result.approval_status === "approved"
                  ? "status-badge approved"
                  : "status-badge rejected"
              }
            >
              {result.approval_status === "approved" ? "Approved" : "Rejected"}
            </span>
            <p className="muted">
              {result.approval_status === "approved"
                ? "This inquiry meets the approval criteria. Track it under Approved Inquiries."
                : "This inquiry did not meet the approval criteria."}
            </p>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
