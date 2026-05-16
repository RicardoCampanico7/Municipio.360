/**
 * @description Apresenta mensagens de feedback acessiveis ao utilizador.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
import type { ReactNode } from "react";
import "./FeedbackAlert.css";

type FeedbackAlertProps = {
  variant: "success" | "error" | "info";
  title: string;
  message: string;
  action?: ReactNode;
};

/**
 * Renderiza um alerta de feedback com estado visual e acessibilidade.
 * @param variant Variante visual e semantica do alerta.
 * @param title Titulo curto da mensagem.
 * @param message Texto descritivo do feedback.
 * @param action Acao opcional apresentada junto ao alerta.
 * @return Elemento React com role alert e aria-live adequado.
 * Pos-condicao: Alertas de erro usam comunicacao assertiva para tecnologias assistivas.
 */
export default function FeedbackAlert({
  variant,
  title,
  message,
  action,
}: FeedbackAlertProps) {
  return (
    <div
      className={["feedback-alert", `is-${variant}`].join(" ")}
      role="alert"
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="feedback-alert-copy">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {action ? <div className="feedback-alert-action">{action}</div> : null}
    </div>
  );
}
