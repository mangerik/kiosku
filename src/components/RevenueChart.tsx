import { useId, useState } from 'react';
import type { Order } from '../lib/types';
import { money } from '../lib/utils';
export default function RevenueChart({ orders, days = 7 }: { orders: Order[]; days?: number }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const grouped = new Map<string, { date: string; value: number }>();
  Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - days + 1 + i);
    const os = orders.filter(
      (o) => o.payment === 'lunas' && new Date(o.createdAt).toDateString() === d.toDateString(),
    );
    if (days >= 365) d.setDate(1);
    else if (days >= 90) d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = d.toDateString();
    const label = d.toLocaleDateString(
      'id-ID',
      days >= 365 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' },
    );
    const previous = grouped.get(key);
    grouped.set(key, {
      date: label,
      value: (previous?.value || 0) + os.reduce((s, o) => s + o.total, 0),
    });
  });
  const values = [...grouped.values()];
  const segments = Math.max(1, values.length - 1);
  const max = Math.max(...values.map((v) => v.value), 100000);
  const w = 720,
    h = 220;
  const points = values
    .map((v, i) => `${(i * w) / segments},${h - (v.value / max) * (h - 20)}`)
    .join(' ');
  return (
    <div className="chart">
      <div className="chart-y">
        {[1, 0.75, 0.5, 0.25, 0].map((n) => (
          <span key={n}>
            {max * n >= 1000000
              ? `${((max * n) / 1000000).toFixed(1)} jt`
              : `${Math.round((max * n) / 1000)} rb`}
          </span>
        ))}
      </div>
      <div className="chart-body">
        <svg
          viewBox={`0 0 ${w} ${h + 4}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Grafik pendapatan ${days} hari, total ${money(values.reduce((s, v) => s + v.value, 0))}`}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#176348" stopOpacity=".16" />
              <stop offset="100%" stopColor="#176348" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((n) => (
            <line
              key={n}
              x1="0"
              y1={h * n}
              x2={w}
              y2={h * n}
              stroke="#e9edea"
              strokeDasharray="4 5"
            />
          ))}
          <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#${id})`} />
          <polyline
            points={points}
            fill="none"
            stroke="#176348"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          {values.map((v, i) => (
            <circle
              key={i}
              cx={(i * w) / segments}
              cy={h - (v.value / max) * (h - 20)}
              r={hover === i ? 6 : 4}
              fill="white"
              stroke="#176348"
              strokeWidth="2"
            >
              <title>
                {v.date}: {money(v.value)}
              </title>
            </circle>
          ))}
        </svg>
        <div className="chart-x">
          {values
            .filter(
              (_, i) =>
                values.length <= 7 ||
                i % Math.ceil(values.length / 6) === 0 ||
                i === values.length - 1,
            )
            .map((v) => (
              <span key={v.date}>{v.date}</span>
            ))}
        </div>
        <div className="chart-hit">
          {values.map((v, i) => (
            <button
              key={i}
              aria-label={`${v.date}: ${money(v.value)}`}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </div>
        {hover !== null && values[hover] && (
          <div className="chart-tooltip">
            <strong>{values[hover].date}</strong>
            {money(values[hover].value)}
          </div>
        )}
      </div>
    </div>
  );
}
