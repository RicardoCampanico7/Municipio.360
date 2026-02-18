import { useState } from "react";
import "./App.css";

type HealthResponse = {
  status?: string;
  ok?: boolean;
  message?: string;
};

export default function App() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkHealth() {
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HealthResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Municipio360 — Frontend</h1>
      <button onClick={checkHealth}>Testar ligação ao Backend</button>

      {data && (
        <pre style={{ marginTop: 16, textAlign: "left" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

      {error && (
        <p style={{ marginTop: 16, color: "crimson" }}>
          Erro: {error}
        </p>
      )}
    </div>
  );
}
