type OccurrenceTone = "progress" | "open" | "done";

type OccurrenceCardProps = {
  status: string;
  title: string;
  time: string;
  tone: OccurrenceTone;
  imageUrl?: string;
};

export default function OccurrenceCard({
  status,
  title,
  time,
  tone,
  imageUrl,
}: OccurrenceCardProps) {
  return (
    <article className="dashboard-report-card">
      {imageUrl && (
        <img
          className="dashboard-report-card-image"
          src={imageUrl}
          alt={title}
        />
      )}
      <span className={`dashboard-pill dashboard-pill-${tone}`}>{status}</span>
      <h4>{title}</h4>
      <p>{time}</p>
    </article>
  );
}
