interface Props {
  lbl:   string;
  val:   string;
  tone:  string;
}

/**
 * Stat — label-caps eyebrow + serif value, used in the Overview headline
 * meta row (Doctrinal frame · Completeness · Network · Last edit).
 */
export function Stat({ lbl, val, tone }: Props) {
  return (
    <div>
      <div className="label-caps mb-1">{lbl}</div>
      <div
        className="font-serif font-medium"
        style={{ fontSize: 15, color: tone }}
      >
        {val}
      </div>
    </div>
  );
}
