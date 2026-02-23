import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAccessToken } from "../services/token";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        throw new Error(msg || "LOGIN_FAILED");
      }

      // ✅ guardar JWT (alinhado com o backend)
      setAccessToken(data.accessToken);

      navigate("/dashboard");
    } catch (err) {
      setError("Credenciais inválidas.");
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Entrar</button>
      </form>

      {error && <p>{error}</p>}
    </div>
  );
}