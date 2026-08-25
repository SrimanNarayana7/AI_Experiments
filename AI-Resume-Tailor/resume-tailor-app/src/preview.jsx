import React from 'react';

const TOKEN = /(==[^=]+==|\[[^\]]+\]|\*\*[^*]+\*\*)/g;

const renderText = (text, baseKey = '') => {
  const out = [];
  let last = 0;
  let m;
  let i = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={`${baseKey}-${i++}`}>{text.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith('==')) {
      out.push(
        <mark key={`${baseKey}-${i++}`} className="rounded bg-yellow-200 px-0.5">
          {renderText(tok.slice(2, -2), `${baseKey}-h`)}
        </mark>,
      );
    } else if (tok.startsWith('[')) {
      out.push(
        <span key={`${baseKey}-${i++}`} className="font-bold text-fill">
          {tok}
        </span>,
      );
    } else {
      out.push(
        <strong key={`${baseKey}-${i++}`} className="font-bold text-ink">
          {tok.slice(2, -2)}
        </strong>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<span key={`${baseKey}-${i++}`}>{text.slice(last)}</span>);
  return out;
};

export function Inline({ text }) {
  if (!text) return null;
  return <>{renderText(text)}</>;
}

function ContactLine({ items }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-steel">
      {items.map((raw, i) => {
        const [label] = String(raw).split('|');
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-rule">•</span>}
            <span>
              <Inline text={label} />
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Role({ role }) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline gap-2">
        <span className="text-base font-bold text-ink">
          <Inline text={role.title} />
        </span>
        {role.org && (
          <>
            <span className="text-rule">|</span>
            <span className="text-base font-semibold text-accent">{role.org}</span>
          </>
        )}
      </div>
      {role.meta && (
        <div className="text-sm italic text-muted">
          <Inline text={role.meta} />
        </div>
      )}
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {(role.bullets || []).map((b, i) => (
          <li key={i} className="text-sm text-steel">
            <Inline text={b} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResumePreview({ spec }) {
  if (!spec) return null;
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 font-[Calibri,Segoe_UI,sans-serif] shadow-sm">
      {spec.name && (
        <div className="text-3xl font-bold uppercase tracking-[0.15em] text-ink">{spec.name}</div>
      )}
      {spec.title && (
        <div className="mt-1 text-lg tracking-[0.15em] text-accent">
          <Inline text={spec.title} />
        </div>
      )}
      {(spec.contact || []).map((line, i) => (
        <ContactLine key={i} items={line} />
      ))}

      {(spec.sections || []).map((s, si) => (
        <section key={si} className="mt-6">
          {s.heading && (
            <div className="border-b-2 border-accent pb-1 text-base font-bold uppercase tracking-[0.15em] text-accent">
              <Inline text={s.heading} />
            </div>
          )}
          {s.body && (
            <p className="mt-2 text-sm leading-relaxed text-steel">
              <Inline text={s.body} />
            </p>
          )}
          {(s.rows || []).map(([l, v], ri) => (
            <div key={ri} className="mt-2 text-sm leading-relaxed">
              <span className="font-bold text-ink">{l} </span>
              <span className="text-steel">
                <Inline text={v} />
              </span>
            </div>
          ))}
          {(s.roles || []).map((r, i) => (
            <Role key={i} role={r} />
          ))}
          {(s.bullets || []).map((b, i) => (
            <div key={i} className="mt-2 text-sm text-steel">
              <span className="mr-2 text-accent">•</span>
              <Inline text={b} />
            </div>
          ))}
          {s.note && (
            <div className="mt-3 text-sm italic text-fill">
              <Inline text={s.note} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
