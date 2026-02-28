type OccurrenceTone = "progress" | "open" | "done";

type OccurrenceCardProps = {
  status: string;
  title: string;
  time: string;
  tone: OccurrenceTone;
};

export default function OccurrenceCard({
  status,
  title,
  time,
  tone,
}: OccurrenceCardProps) {
  return (
    <article className="dashboard-report-card">
      <span className={`dashboard-pill dashboard-pill-${tone}`}>{status}</span>
      <h4>{title}</h4>
      <p>{time}</p>
    </article>
  );
}
