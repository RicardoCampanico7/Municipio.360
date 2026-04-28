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
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import FeedbackAlert from "../components/FeedbackAlert";
import {
  createOccurrence,
  OccurrencesRequestError,
  type OccurrenceCategoryKey,
} from "../services/occurrences";
import { clearAccessToken, getAccessSession, getRawAccessToken } from "../services/token";
import "./NewOccurrence.css";

type SelectedImage = {
  id: string;
  file: File;
  name: string;
  size: number;
  dataUrl: string;
};

type SubmissionState = "idle" | "loading" | "success" | "error";

type ApiErrorPayload = {
  message?: string | string[];
};

const categories = [
  { label: "Buracos no pavimento", value: "BURACOS_PAVIMENTO", icon: Construction },
  { label: "Iluminacao publica", value: "ILUMINACAO_PUBLICA", icon: Lightbulb },
  { label: "Limpeza urbana", value: "LIMPEZA_URBANA", icon: TriangleAlert },
  { label: "Ruido", value: "RUIDO", icon: Volume2 },
  { label: "Espacos publicos", value: "ESPACOS_PUBLICOS", icon: Trees },
  { label: "Sinalizacao", value: "SINALIZACAO", icon: Signpost },
] as const;

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const DEFAULT_MAP_QUERY = "Faro Portugal";
const DEFAULT_MAP_NOTE = "Escreve a morada ou usa a tua localizacao atual para atualizar o Google Maps.";
const SUCCESS_REDIRECT_SECONDS = 8;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nao foi possivel ler a imagem selecionada."));
    };
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
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

function extractApiMessage(payload: ApiErrorPayload | null) {
  if (!payload) return "";
  return Array.isArray(payload.message) ? payload.message.join(", ") : payload.message ?? "";
}

function getSubmissionErrorMessage(status: number, payload: ApiErrorPayload | null) {
  const rawMessage = extractApiMessage(payload).toLowerCase();

  if (status === 400 || status === 422) {
    if (rawMessage.includes("3 mb")) {
      return "Cada fotografia pode ter no maximo 3 MB.";
    }

    if (rawMessage.includes("maximo 3 fotografias")) {
      return "Podes anexar no maximo 3 fotografias por ocorrencia.";
    }

    if (
      rawMessage.includes("png") ||
      rawMessage.includes("jpeg") ||
      rawMessage.includes("webp") ||
      rawMessage.includes("gif") ||
      rawMessage.includes("imagem")
    ) {
      return "Adiciona fotografias em formato valido: PNG, JPEG, WEBP ou GIF.";
    }

    return "Verifica os campos do formulario e tenta novamente.";
  }

  if (status === 401) {
    return "A tua sessao expirou. Inicia sessao novamente para submeter a ocorrencia.";
  }

  if (status === 403) {
    return "Nao tens permissao para submeter esta ocorrencia com a sessao atual.";
  }

  return "Nao foi possivel submeter a ocorrencia. Tenta novamente dentro de instantes.";
}

export default function NewOccurrence() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [category, setCategory] = useState<OccurrenceCategoryKey>(categories[0].value);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [submitState, setSubmitState] = useState<SubmissionState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(SUCCESS_REDIRECT_SECONDS);
  const [mapNote, setMapNote] = useState(DEFAULT_MAP_NOTE);

  const trimmedLocation = location.trim();
  const mapQuery = trimmedLocation || DEFAULT_MAP_QUERY;
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`;
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const clearErrorFeedback = () => {
    if (submitState === "error") {
      setSubmitState("idle");
      setFeedbackMessage("");
    }
  };

  const resetForm = () => {
    setCategory(categories[0].value);
    setLocation("");
    setDescription("");
    setSelectedImages([]);
    setMapNote(DEFAULT_MAP_NOTE);
  };

  const redirectToLoginForExpiredSession = (hadStoredSession = !!getRawAccessToken()) => {
    clearAccessToken();
    navigate("/login", {
      replace: true,
      state: {
        from: "/occurrences/new",
        ...(hadStoredSession ? { sessionExpired: true } : {}),
      },
    });
  };

  useEffect(() => {
    if (submitState !== "success") {
      setRedirectCountdown(SUCCESS_REDIRECT_SECONDS);
      return;
    }

    const intervalId = window.setInterval(() => {
      setRedirectCountdown((current) => (current > 1 ? current - 1 : current));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      navigate("/dashboard");
    }, SUCCESS_REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [navigate, submitState]);

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setMapNote("O mapa atualiza com a morada ou coordenadas que introduzires.");
    clearErrorFeedback();
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    clearErrorFeedback();
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSubmitState("error");
      setFeedbackMessage("O teu navegador nao suporta geolocalizacao.");
      return;
    }

    setLocationLoading(true);
    clearErrorFeedback();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setLocation(coordinates);
        setMapNote("Localizacao atual aplicada. Se quiseres, podes ajustar a morada manualmente depois.");
        setLocationLoading(false);
      },
      () => {
        setSubmitState("error");
        setFeedbackMessage("Nao foi possivel obter a tua localizacao atual. Verifica as permissoes do navegador.");
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
      setSubmitState("error");
      setFeedbackMessage(`Podes adicionar ate ${MAX_IMAGES} fotografias.`);
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
      rejectedMessages.push(`Podes adicionar no maximo ${MAX_IMAGES} fotografias.`);
    });

    nextFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        rejectedMessages.push(`O ficheiro "${file.name}" nao e uma imagem valida.`);
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
            file,
            name: file.name,
            size: file.size,
            dataUrl: await readFileAsDataUrl(file),
          })),
        );

        setSelectedImages((current) => [...current, ...processedImages]);
      } catch (imageError) {
        setSubmitState("error");
        setFeedbackMessage(
          imageError instanceof Error
            ? imageError.message
            : "Nao foi possivel carregar as fotografias selecionadas.",
        );
        return;
      }
    }

    if (rejectedMessages.length) {
      setSubmitState("error");
      setFeedbackMessage(rejectedMessages[0]);
      return;
    }

    clearErrorFeedback();
  };

  const handleRemoveImage = (imageId: string) => {
    setSelectedImages((current) => current.filter((image) => image.id !== imageId));
    clearErrorFeedback();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitState("loading");
    setFeedbackMessage("");
    setLoading(true);

    const { token, hadStoredSession } = getAccessSession();
    if (!token) {
      redirectToLoginForExpiredSession(hadStoredSession);
      setLoading(false);
      return;
    }

    try {
      const trimmedDescription = description.trim();

      if (!trimmedLocation || !trimmedDescription) {
        setSubmitState("error");
        setFeedbackMessage("Preenche a localizacao e a descricao antes de enviar.");
        setLoading(false);
        return;
      }

      await createOccurrence(
        {
          category,
          location: trimmedLocation,
          description: trimmedDescription,
          imageFiles: selectedImages.map((image) => image.file),
        },
        token,
        "Nao foi possivel submeter a ocorrencia.",
      );

      resetForm();
      setSubmitState("success");
      setFeedbackMessage("A ocorrencia foi submetida com sucesso e sera encaminhada para analise.");
    } catch (submitError) {
      if (submitError instanceof OccurrencesRequestError) {
        if (submitError.status === 401) {
          redirectToLoginForExpiredSession(hadStoredSession);
          return;
        }

        setSubmitState("error");
        setFeedbackMessage(
          getSubmissionErrorMessage(submitError.status, { message: submitError.message }),
        );
        return;
      }

      setSubmitState("error");
      setFeedbackMessage(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel submeter a ocorrencia.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="occ-screen">
      <section className="occ-shell" aria-label="Nova ocorrencia">
        <aside className="occ-panel">
          <div className="occ-map-actions">
            <button
              className="occ-map-action occ-map-action-primary"
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locationLoading || loading}
            >
              <MapPinned size={16} strokeWidth={2.2} />
              {locationLoading ? "A localizar..." : "Usar a minha localizacao"}
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
                title="Google Maps da localizacao selecionada"
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
            <h1 className="occ-title">Nova ocorrencia</h1>
            <p className="occ-subtitle">Preenche o formulario e envia o reporte diretamente para analise.</p>
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
              onChange={(event) => handleLocationChange(event.target.value)}
              disabled={loading}
              required
            />

            <p className="occ-map-note">{mapNote}</p>

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
                      key={item.value}
                      type="button"
                      className={["occ-chip", item.value === category ? "is-active" : ""].filter(Boolean).join(" ")}
                      onClick={() => {
                        setCategory(item.value);
                        clearErrorFeedback();
                      }}
                      disabled={loading}
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
              Descricao
            </label>
            <textarea
              id="occ-description"
              className="occ-textarea"
              placeholder="Descreve o que esta a acontecer e qualquer detalhe util."
              value={description}
              onChange={(event) => handleDescriptionChange(event.target.value)}
              disabled={loading}
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
                disabled={loading}
              />

              <div className="occ-upload-toolbar">
                <button className="occ-image-add" type="button" onClick={handleOpenFilePicker} disabled={loading}>
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
                        disabled={loading}
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                        Apagar
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="occ-upload-empty">
                  Seleciona fotografias do teu dispositivo para juntar a ocorrencia.
                </div>
              )}
            </fieldset>

            {submitState === "loading" && (
              <FeedbackAlert
                variant="info"
                title="A submeter ocorrencia"
                message="Estamos a enviar os dados. Aguarda um instante."
              />
            )}

            {submitState === "success" && (
              <FeedbackAlert
                variant="success"
                title="Ocorrencia enviada com sucesso"
                message={`${feedbackMessage} Vais ser redirecionado para o dashboard em ${redirectCountdown} segundos.`}
                action={
                  <button className="occ-inline-action" type="button" onClick={() => navigate("/dashboard")}>
                    Ir agora
                  </button>
                }
              />
            )}

            {submitState === "error" && (
              <FeedbackAlert
                variant="error"
                title="Nao foi possivel enviar a ocorrencia"
                message={feedbackMessage}
              />
            )}

            <div className="occ-actions">
              <button
                className="occ-button occ-button-secondary"
                type="button"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
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
