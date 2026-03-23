import type { ReactNode } from "react";
import "./FeedbackAlert.css";

type FeedbackAlertProps = {
  variant: "success" | "error" | "info";
  title: string;
  message: string;
  action?: ReactNode;
};

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
