const sections = [
  {
    title: 'Agents',
    description: 'Agent health and role summaries will render here.'
  },
  {
    title: 'Cron Jobs',
    description: 'Scheduled jobs and run outcomes will render here.'
  },
  {
    title: 'Activity',
    description: 'Recent planner/worker activity will render here.'
  }
];

export default function HomePage() {
  return (
    <main className="container">
      <header>
        <p className="eyebrow">DACL</p>
        <h1>Ops Dashboard</h1>
        <p className="subtitle">Minimal Next.js shell ready for iterative sections.</p>
      </header>

      <section className="grid" aria-label="Dashboard sections">
        {sections.map((section) => (
          <article key={section.title} className="card">
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
