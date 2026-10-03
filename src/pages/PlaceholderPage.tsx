import './PlaceholderPage.css'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="placeholder">
      <div className="placeholder-heading">
        <h1>{title}</h1>
      </div>
      <div className="placeholder-card">
        <p>{description}</p>
      </div>
    </section>
  )
}
