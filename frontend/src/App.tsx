import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Login from "./pages/Login";
import NewOccurrence from "./pages/NewOccurrence";
import PublicReports from "./pages/PublicReports";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<Home />} />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Rotas protegidas */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/occurrences/new"
        element={
          <ProtectedRoute>
            <NewOccurrence />
          </ProtectedRoute>
        }
      />
      <Route path="/occurrences/public" element={<PublicReports />} />
    </Routes>
  );
}

export default App;
