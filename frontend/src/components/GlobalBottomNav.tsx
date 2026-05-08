import { FileText, Home, Map, Plus, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAccessToken, isAuthenticated } from "../services/token";
import "./GlobalBottomNav.css";

type NavTarget = "home" | "map" | "create" | "reports" | "profile";

const targetRoutes: Record<NavTarget, string> = {
  home: "/dashboard",
  map: "/occurrences/map",
  create: "/occurrences/new",
  reports: "/occurrences/public",
  profile: "/profile",
};

export default function GlobalBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const isHiddenRoute =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register";

  if (isHiddenRoute) return null;

  const navItems = [
    { icon: Home, label: t("dashboard.nav.home"), target: "home" as const },
    { icon: Map, label: t("dashboard.nav.map"), target: "map" as const },
    { icon: Plus, label: t("dashboard.nav.create"), target: "create" as const, accent: true },
    { icon: FileText, label: t("dashboard.nav.reports"), target: "reports" as const },
    { icon: User, label: t("dashboard.nav.profile"), target: "profile" as const },
  ];

  const isActive = (target: NavTarget) => {
    const { pathname } = location;

    if (target === "home") return pathname === "/" || pathname === "/dashboard";
    if (target === "map") return pathname.startsWith("/occurrences/map");
    if (target === "create") return pathname.startsWith("/occurrences/new");
    if (target === "reports") return pathname.startsWith("/occurrences/public");
    return pathname.startsWith("/profile");
  };

  const handleNavClick = (target: NavTarget) => {
    const route = targetRoutes[target];

    if ((target === "create" || target === "profile") && !authenticated) {
      clearAccessToken();
      navigate("/login", { replace: true, state: { from: route } });
      return;
    }

    navigate(route);
  };

  return (
    <nav className="global-bottom-nav" aria-label={t("profile.navigationLabel")}>
      {navItems.map((item) => (
        <button
          key={item.label}
          className={[
            "global-nav-item",
            isActive(item.target) ? "is-active" : "",
            item.accent ? "is-accent" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          type="button"
          onClick={() => handleNavClick(item.target)}
        >
          <span className="global-nav-icon">
            <item.icon size={20} strokeWidth={2.2} />
          </span>
          {!item.accent && <span className="global-nav-label">{item.label}</span>}
        </button>
      ))}
    </nav>
  );
}
