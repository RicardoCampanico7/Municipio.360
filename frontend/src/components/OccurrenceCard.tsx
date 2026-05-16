/**
 * @description Apresenta um resumo compacto de uma ocorrencia no dashboard.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
type OccurrenceTone = "progress" | "open" | "done";

type OccurrenceCardProps = {
  status: string;
  title: string;
  time: string;
  tone: OccurrenceTone;
  onClick?: () => void;
};

/**
 * Renderiza um cartao de ocorrencia com estado, titulo e data.
 * @param status Texto do estado apresentado no cartao.
 * @param title Titulo ou categoria da ocorrencia.
 * @param time Texto da data associada a ocorrencia.
 * @param tone Variante visual do estado.
 * @param onClick Acao opcional executada quando o cartao e clicavel.
 * @return Elemento React como botao clicavel ou artigo estatico.
 * Pos-condicao: Quando existe onClick, o elemento renderizado e interativo.
 */
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
