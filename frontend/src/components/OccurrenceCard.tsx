type OccurrenceTone = "progress" | "open" | "done";

type OccurrenceCardProps = {
  status: string;
  title: string;
  time: string;
  tone: OccurrenceTone;
  onClick?: () => void;
};

export default function OccurrenceCard({
  status,
  title,
  time,
  tone,
  onClick,
}: OccurrenceCardProps) {
  const content = (
    <>
      <span className={`dashboard-pill dashboard-pill-${tone}`}>{status}</span>
      <h4>{title}</h4>
      <p>{time}</p>
    </>
  );

  return onClick ? (
    <button
      className="dashboard-report-card dashboard-report-card-button"
      type="button"
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <article className="dashboard-report-card">
      {content}
    </article>
  );
}
