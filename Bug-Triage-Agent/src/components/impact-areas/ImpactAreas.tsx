import { LayersIcon } from '../icons';

interface ImpactAreasProps {
  areas: string[];
}

export function ImpactAreas({ areas }: ImpactAreasProps) {
  return (
    <section className="card impact-card" aria-labelledby="impact-heading">
      <div className="section-heading">
        <span className="section-heading__icon" aria-hidden="true">
          <LayersIcon size={16} />
        </span>
        <h3 className="section-heading__title" id="impact-heading">
          Impact Areas
        </h3>
      </div>
      <ul className="impact-card__list">
        {areas.map((area) => (
          <li className="impact-tag" key={area}>
            {area}
          </li>
        ))}
      </ul>
    </section>
  );
}
