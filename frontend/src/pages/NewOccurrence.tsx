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
import { useRef, useState } from "react";
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

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const DEFAULT_MAP_QUERY = "Faro Portugal";

type SelectedImage = {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Não foi possível ler a imagem selecionada."));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (sizeInBytes >= 1024) {
    return `${Math.round(sizeInBytes / 1024)} KB`;
  }

  return `${sizeInBytes} B`;
}

export default function NewOccurrence() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [category, setCategory] = useState<string>(categories[0].label);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapNote, setMapNote] = useState(
    "Escreve a morada ou usa a tua localização atual para atualizar o Google Maps.",
  );

  const trimmedLocation = location.trim();
  const mapQuery = trimmedLocation || DEFAULT_MAP_QUERY;
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`;
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

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

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setMapNote("O mapa atualiza com a morada ou coordenadas que introduzires.");
    if (error) setError("");
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("O teu navegador não suporta geolocalização.");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setLocation(coordinates);
        setMapNote(
          "Localização atual aplicada. Se quiseres, podes ajustar a morada manualmente depois.",
        );
        setLocationLoading(false);
      },
      () => {
        setError("Não foi possível obter a tua localização atual. Verifica as permissões do navegador.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const handleOpenFilePicker = () => {
    if (selectedImages.length >= MAX_IMAGES) {
      setError(`Podes adicionar até ${MAX_IMAGES} fotografias.`);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) return;

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const nextFiles = files.slice(0, remainingSlots);
    const acceptedFiles: File[] = [];
    const rejectedMessages: string[] = [];

    files.slice(remainingSlots).forEach(() => {
      rejectedMessages.push(`Podes adicionar no máximo ${MAX_IMAGES} fotografias.`);
    });

    nextFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        rejectedMessages.push(`O ficheiro "${file.name}" não é uma imagem válida.`);
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejectedMessages.push(`A imagem "${file.name}" excede 3 MB.`);
        return;
      }

      acceptedFiles.push(file);
    });

    if (acceptedFiles.length) {
      try {
        const processedImages = await Promise.all(
          acceptedFiles.map(async (file) => ({
            id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            dataUrl: await readFileAsDataUrl(file),
          })),
        );

        setSelectedImages((current) => [...current, ...processedImages]);
      } catch (imageError) {
        const message =
          imageError instanceof Error
            ? imageError.message
            : "Não foi possível carregar as fotografias selecionadas.";
        setError(message);
        return;
      }
    }

    if (rejectedMessages.length) {
      setError(rejectedMessages[0]);
      return;
    }

    if (error) setError("");
  };

  const handleRemoveImage = (imageId: string) => {
    setSelectedImages((current) => current.filter((image) => image.id !== imageId));
    if (error) setError("");
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
      const trimmedDescription = description.trim();

      if (!trimmedLocation || !trimmedDescription) {
        setError("Preenche a localização e a descrição antes de enviar.");
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
          imageUrls: selectedImages.length
            ? selectedImages.map((image) => image.dataUrl)
            : undefined,
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
        <aside className="occ-panel">
          <div className="occ-map-actions">
            <button
              className="occ-map-action occ-map-action-primary"
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locationLoading}
            >
              <MapPinned size={16} strokeWidth={2.2} />
              {locationLoading ? "A localizar..." : "Usar a minha localização"}
            </button>
            <a
              className="occ-map-action occ-map-action-secondary"
              href={googleMapsLink}
              target="_blank"
              rel="noreferrer"
            >
              Ver no Google Maps
            </a>
          </div>

          <div className="occ-map-frame">
            <div className="occ-map">
              <iframe
                className="occ-map-embed"
                title="Google Maps da localização selecionada"
                src={googleMapsEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
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
              Localização
            </label>
            <input
              id="occ-location"
              className="occ-input"
              type="text"
              placeholder="Ex.: Avenida Central, Faro"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
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
                Fotografias
              </legend>

              <input
                ref={fileInputRef}
                className="occ-file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
              />

              <div className="occ-upload-toolbar">
                <button className="occ-image-add" type="button" onClick={handleOpenFilePicker}>
                  <Camera size={16} strokeWidth={2.2} />
                  {selectedImages.length ? "Adicionar mais fotos" : "Escolher fotografias"}
                </button>
                <span className="occ-upload-counter">
                  {selectedImages.length}/{MAX_IMAGES} fotografias
                </span>
              </div>

              {selectedImages.length ? (
                <div className="occ-upload-grid">
                  {selectedImages.map((image) => (
                    <article className="occ-upload-card" key={image.id}>
                      <img className="occ-upload-preview" src={image.dataUrl} alt={image.name} />
                      <div className="occ-upload-meta">
                        <strong>{image.name}</strong>
                        <span>{formatFileSize(image.size)}</span>
                      </div>
                      <button
                        className="occ-image-remove"
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        aria-label={`Apagar ${image.name}`}
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                        Apagar
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="occ-upload-empty">
                  Seleciona fotografias do teu dispositivo para juntar à ocorrência.
                </div>
              )}
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
