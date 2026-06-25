import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import {
  createMachine,
  createProduct,
  deleteMachine,
  deleteProduct,
  fetchMachines,
  fetchProducts,
} from "../api";
import { formatIDR } from "../utils/currency";

const emptyProductForm = { name: "", cogs_per_kg: "" };
const emptyMachineForm = { name: "", cost: "" };

export default function CatalogManagement() {
  const [products, setProducts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [machineForm, setMachineForm] = useState(emptyMachineForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddProduct(e) {
    e.preventDefault();
    setError("");
    try {
      await createProduct({
        name: productForm.name,
        cogs_per_kg: Number(productForm.cogs_per_kg),
      });
      setProductForm(emptyProductForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddMachine(e) {
    e.preventDefault();
    setError("");
    try {
      await createMachine({
        name: machineForm.name,
        cost: Number(machineForm.cost),
      });
      setMachineForm(emptyMachineForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteProduct(id) {
    try {
      await deleteProduct(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteMachine(id) {
    try {
      await deleteMachine(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalInvestment = machines.reduce((sum, machine) => sum + machine.cost, 0);

  return (
    <AppLayout
      title="Catalog Management"
      subtitle="Manage coffee products and machine costs for the sales team"
    >
      {error && <p className="error banner-error">{error}</p>}

      <section className="card">
        <h2>Investment Overview</h2>
        <p className="section-desc">
          Total machine investment used by the sales calculator:{" "}
          <strong>{formatIDR(totalInvestment)}</strong>
        </p>
      </section>

      <section className="card">
        <h2>Machine Costs</h2>
        <p className="section-desc">
          Machine costs are summed to form the total investment amount.
        </p>

        <form className="inline-form" onSubmit={handleAddMachine}>
          <input
            type="text"
            placeholder="Machine name"
            value={machineForm.name}
            onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Cost (IDR)"
            min="0"
            step="0.01"
            value={machineForm.cost}
            onChange={(e) => setMachineForm({ ...machineForm, cost: e.target.value })}
            required
          />
          <button type="submit">Add machine</button>
        </form>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : machines.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Cost</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => (
                <tr key={machine.id}>
                  <td>{machine.name}</td>
                  <td>{formatIDR(machine.cost)}</td>
                  <td>
                    <button
                      className="btn-link danger"
                      onClick={() => handleDeleteMachine(machine.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No machines added yet.</p>
        )}
      </section>

      <section className="card">
        <h2>Coffee Products</h2>
        <p className="section-desc">
          Add each coffee product with its COGS per kg. Sales sets the selling price
          per client in the calculator.
        </p>

        <form className="inline-form" onSubmit={handleAddProduct}>
          <input
            type="text"
            placeholder="Product name"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="COGS / kg (IDR)"
            min="0"
            step="0.01"
            value={productForm.cogs_per_kg}
            onChange={(e) =>
              setProductForm({ ...productForm, cogs_per_kg: e.target.value })
            }
            required
          />
          <button type="submit">Add product</button>
        </form>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : products.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>COGS / kg</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{formatIDR(product.cogs_per_kg)}</td>
                  <td>
                    <button
                      className="btn-link danger"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No products added yet.</p>
        )}
      </section>
    </AppLayout>
  );
}
