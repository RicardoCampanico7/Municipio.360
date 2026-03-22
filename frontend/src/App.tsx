import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Login from "./pages/Login";
import NewOccurrence from "./pages/NewOccurrence";
import Profile from "./pages/Profile";
import PublicReports from "./pages/PublicReports";
import PublicOccurrenceDetail from "./pages/PublicOccurrenceDetail";
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

      {/* Rotas publicas e protegidas */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route
        path="/occurrences/new"
        element={
          <ProtectedRoute>
            <NewOccurrence />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/occurrences/public" element={<PublicReports />} />
      <Route path="/occurrences/public/:occurrenceId" element={<PublicOccurrenceDetail />} />
    </Routes>
  );
}

export default App;
