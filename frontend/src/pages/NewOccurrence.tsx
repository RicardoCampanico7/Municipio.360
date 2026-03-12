import {
  ArrowLeft,
  Camera,
  Construction,
  Lightbulb,
  MapPinned,
  Signpost,
  Trash2,
  Trees,
  TriangleAlert,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import { clearAccessToken, getAccessToken, getRawAccessToken } from "../services/token";
import "./NewOccurrence.css";

const categories = [
  { label: "Buracos e pavimento", icon: Construction },
  { label: "Iluminação pública", icon: Lightbulb },
  { label: "Limpeza urbana", icon: TriangleAlert },
  { label: "Ruído", icon: Volume2 },
  { label: "Espaços públicos", icon: Trees },
  { label: "Sinalização", icon: Signpost },
] as const;

export default function NewOccurrence() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [category, setCategory] = useState<string>(categories[0].label);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectToLoginForExpiredSession = () => {
    const hadStoredSession = !!getRawAccessToken();
    clearAccessToken();
    navigate("/login", {
      replace: true,
      state: {
        from: "/occurrences/new",
        ...(hadStoredSession ? { sessionExpired: true } : {}),
      },
    });
  };

  const filledImageUrls = imageUrls.map((url) => url.trim()).filter(Boolean);

  const handleImageChange = (index: number, value: string) => {
    setImageUrls((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  };

  const handleAddImage = () => {
    setImageUrls((current) => {
      if (current.length >= 3) return current;
      return [...current, ""];
    });
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((current) => {
      if (current.length === 1) return [""];
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = getAccessToken();
    if (!token) {
      redirectToLoginForExpiredSession();
      setLoading(false);
      return;
    }

    try {
      const trimmedLocation = location.trim();
      const trimmedDescription = description.trim();

      if (!trimmedLocation || !trimmedDescription) {
        setError("Preenche a localizacao e a descricao antes de enviar.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/occurrences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          location: trimmedLocation,
          description: trimmedDescription,
          imageUrls: filledImageUrls.length ? filledImageUrls : undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLoginForExpiredSession();
          return;
        }
        const message =
          Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        throw new Error(message || "Não foi possível criar a ocorrência.");
      }

      navigate("/dashboard");
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Não foi possível criar a ocorrência.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="occ-screen">
      <section className="occ-shell" aria-label="Nova ocorrência">
        <aside className="occ-panel" aria-hidden="true">
          <div className="occ-map-toolbar">
            <span className="occ-map-kicker">
              <MapPinned size={15} strokeWidth={2.2} />
              Localização da ocorrência
            </span>
            <p>Define o ponto no mapa e confirma a morada no campo abaixo.</p>
          </div>

          <div className="occ-map-frame">
            <div className="occ-map">
              <div className="occ-map-grid" />
              <div className="occ-map-road occ-map-road-main" />
              <div className="occ-map-road occ-map-road-side" />
              <div className="occ-map-pin" />
            </div>
          </div>

          <div className="occ-map-location">
            <label className="occ-map-label" htmlFor="occ-location-preview">
              <MapPinned size={16} strokeWidth={2.2} />
              Morada selecionada
            </label>
            <input
              id="occ-location-preview"
              className="occ-input"
              type="text"
              placeholder="Ex.: Avenida Central, Faro"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
        </aside>

        <section className="occ-form-card">
          <div className="occ-topbar">
            <button className="occ-back" type="button" onClick={() => navigate("/dashboard")}>
              <ArrowLeft size={16} strokeWidth={2.4} />
              Voltar
            </button>

            <div className="occ-brand">
              <AppLogo className="occ-brand-logo" />
              <div className="occ-brand-name">{t("appName")}</div>
            </div>
          </div>

          <div>
            <h1 className="occ-title">Nova ocorrência</h1>
            <p className="occ-subtitle">
              Preenche o formulário e envia o reporte diretamente para análise.
            </p>
          </div>

          <form className="occ-form" onSubmit={handleSubmit}>
            <label className="occ-field-label" htmlFor="occ-location">
              <MapPinned size={16} strokeWidth={2.2} />
              Localizacao
            </label>
            <input
              id="occ-location"
              className="occ-input"
              type="text"
              placeholder="Ex.: Avenida Central, Faro"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <fieldset className="occ-fieldset">
              <legend>
                <TriangleAlert size={16} strokeWidth={2.2} />
                Categoria
              </legend>
              <div className="occ-grid">
                {categories.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={["occ-chip", item.label === category ? "is-active" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setCategory(item.label)}
                    >
                      <span className="occ-chip-icon" aria-hidden="true">
                        <Icon size={18} strokeWidth={2.2} />
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="occ-field-label" htmlFor="occ-description">
              <TriangleAlert size={16} strokeWidth={2.2} />
              Descrição
            </label>
            <textarea
              id="occ-description"
              className="occ-textarea"
              placeholder="Descreve o que está a acontecer e qualquer detalhe útil."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <fieldset className="occ-fieldset">
              <legend>
                <Camera size={16} strokeWidth={2.2} />
                Fotografias (URLs opcionais)
              </legend>
              <div className="occ-image-list">
                {imageUrls.map((url, index) => (
                  <div className="occ-image-row" key={`${index}-${url}`}>
                    <input
                      className="occ-input"
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={url}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                    />
                    <button
                      className="occ-image-remove"
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      aria-label="Remover imagem"
                    >
                      <Trash2 size={16} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
                {imageUrls.length < 3 && (
                  <button className="occ-image-add" type="button" onClick={handleAddImage}>
                    <Camera size={16} strokeWidth={2.2} />
                    Adicionar outra imagem
                  </button>
                )}
              </div>
            </fieldset>

            {error && <div className="occ-error">{error}</div>}

            <div className="occ-actions">
              <button
                className="occ-button occ-button-secondary"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Cancelar
              </button>
              <button className="occ-button occ-button-primary" type="submit" disabled={loading}>
                {loading ? "A enviar..." : "Enviar ocorrência"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

