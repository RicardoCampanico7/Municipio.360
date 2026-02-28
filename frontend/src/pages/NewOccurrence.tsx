import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../services/token";
import "./NewOccurrence.css";

const categories = [
  "Buracos e pavimento",
  "Iluminacao publica",
  "Limpeza urbana",
  "Ruido",
  "Espacos publicos",
  "Sinalizacao",
];

export default function NewOccurrence() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [category, setCategory] = useState(categories[0]);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError("Sessao expirada. Volta a iniciar sessao.");
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/occurrences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          location,
          description,
          imageUrls: filledImageUrls.length ? filledImageUrls : undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
        throw new Error(message || "Nao foi possivel criar a ocorrencia.");
      }

      navigate("/dashboard");
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Nao foi possivel criar a ocorrencia.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="occ-screen">
      <section className="occ-shell" aria-label="Nova ocorrencia">
        <aside className="occ-panel" aria-hidden="true">
          <div className="occ-map-toolbar">
            <span className="occ-map-kicker">Localizacao da ocorrencia</span>
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
              Morada selecionada
            </label>
            <input
              id="occ-location-preview"
              className="occ-input"
              type="text"
              placeholder="Ex.: Avenida Central, Faro"
              value={location}
              readOnly
            />
          </div>
        </aside>

        <section className="occ-form-card">
          <div className="occ-topbar">
            <button className="occ-back" type="button" onClick={() => navigate("/dashboard")}>
              Voltar
            </button>

            <div className="occ-brand">
              <div className="occ-brand-badge" aria-hidden="true">
                M
              </div>
              <div className="occ-brand-name">{t("appName")}</div>
            </div>
          </div>

          <div>
            <h1 className="occ-title">Nova ocorrencia</h1>
            <p className="occ-subtitle">
              Preenche o formulario e envia o reporte diretamente para analise.
            </p>
          </div>

          <form className="occ-form" onSubmit={handleSubmit}>
            <fieldset className="occ-fieldset">
              <legend>Categoria</legend>
              <div className="occ-grid">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={["occ-chip", item === category ? "is-active" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="occ-field-label" htmlFor="occ-description">
              Descricao
            </label>
            <textarea
              id="occ-description"
              className="occ-textarea"
              placeholder="Descreve o que esta a acontecer e qualquer detalhe util."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <fieldset className="occ-fieldset">
              <legend>Fotografias (URLs opcionais)</legend>
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
                      X
                    </button>
                  </div>
                ))}
                {imageUrls.length < 3 && (
                  <button className="occ-image-add" type="button" onClick={handleAddImage}>
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
                {loading ? "A enviar..." : "Enviar ocorrencia"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
