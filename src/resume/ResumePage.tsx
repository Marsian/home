import type { ReactNode } from 'react'
import { resumeContent } from './resumeContent'

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-[2mm] text-[10.5pt] font-semibold text-black">{children}</div>
}

export default function ResumePage() {
  const c = resumeContent

  return (
    <div className="resume-sheet bg-white px-[14mm] py-[14mm] text-[10.5pt] leading-[1.35]">
      {/* Header */}
      <div className="flex items-start justify-between gap-[6mm]">
        <div>
          <div className="text-[16pt] font-semibold leading-[1.05]">{c.name}</div>
          <div className="mt-[2mm] text-[12pt] font-medium text-gray-900">{c.title}</div>
        </div>

        <div className="text-right text-[9.5pt] text-gray-800">
          {c.location ? <div>{c.location}</div> : null}
          <div className="mt-[1.2mm]">{c.email}</div>
          {c.phone ? <div>{c.phone}</div> : null}
          {c.links?.length ? (
            <div className="mt-[1.2mm] flex flex-col items-end gap-[1mm]">
              {c.links.map((l) => (
                <a key={l.url} href={l.url} className="underline" target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-[6mm] text-[10pt] text-gray-900">
        <SectionTitle>个人简介</SectionTitle>
        <div className="text-[10pt]">{c.summary}</div>
      </div>

      {/* Main grid */}
      <div className="mt-[6mm] grid grid-cols-12 gap-x-[6mm]">
        {/* Left */}
        <aside className="col-span-3">
          <SectionTitle>技能</SectionTitle>
          <ul className="space-y-[1.4mm] text-[9.5pt] text-gray-900">
            {c.skills.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>

          {/* Education (optional) */}
          {c.education?.length ? (
            <div className="mt-[7mm]">
              <SectionTitle>教育</SectionTitle>
              <div className="space-y-[4mm]">
                {c.education.map((e) => (
                  <div key={e.school}>
                    <div className="font-medium">{e.school}</div>
                    <div className="text-gray-800">
                      {e.degree ? `${e.degree} · ` : ''}
                      <span>{e.period}</span>
                    </div>
                    {e.bullets?.length ? (
                      <ul className="mt-[2mm] space-y-[1.2mm]">
                        {e.bullets.map((b) => (
                          <li key={b}>• {b}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* Right */}
        <section className="col-span-9">
          <SectionTitle>工作经历</SectionTitle>
          <div className="space-y-[6mm]">
            {c.experiences.map((ex) => (
              <div key={`${ex.company}-${ex.role}-${ex.period}`}>
                <div className="flex items-baseline justify-between gap-[4mm]">
                  <div className="font-medium">
                    {ex.company} · {ex.role}
                  </div>
                  <div className="text-[9.5pt] text-gray-800">{ex.period}</div>
                </div>
                <ul className="mt-[2mm] space-y-[1.4mm] text-[10pt]">
                  {ex.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

