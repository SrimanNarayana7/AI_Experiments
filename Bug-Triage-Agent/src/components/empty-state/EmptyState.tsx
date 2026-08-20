import { SearchIcon } from '../icons';

export function EmptyState() {
  return (
    <section className="empty-state" aria-label="No analysis yet">
      <span className="empty-state__icon" aria-hidden="true">
        <SearchIcon size={24} />
      </span>
      <h2 className="empty-state__title">No analysis yet</h2>
      <p className="empty-state__text">
        Enter a Jira bug issue key to begin AI-powered triage. Results will appear here.
      </p>
    </section>
  );
}
