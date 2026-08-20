import { useState } from 'react';
import type { FormEvent } from 'react';
import { validateIssueKey } from '../../utils/validation';
import { SparklesIcon } from '../icons';

interface JiraInputProps {
  onSubmit: (issueKey: string) => void;
  disabled?: boolean;
}

/**
 * Prominent Jira issue key input with inline validation.
 * Supports Enter to submit and disables duplicate submissions.
 */
export function JiraInput({ onSubmit, disabled = false }: JiraInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }
    const message = validateIssueKey(value);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onSubmit(value.trim().toUpperCase());
  }

  function handleChange(next: string) {
    setValue(next);
    if (error) {
      setError(null);
    }
  }

  const inputId = 'jira-issue-key';
  const errorId = 'jira-issue-key-error';

  return (
    <form className="jira-input" onSubmit={handleSubmit} noValidate>
      <label className="jira-input__label" htmlFor={inputId}>
        Jira Bug Issue Key
      </label>
      <div className="jira-input__row">
        <input
          id={inputId}
          className="jira-input__field"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
          placeholder="KAN-13"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required="true"
        />
        <button
          className="btn btn--primary btn--lg jira-input__submit"
          type="submit"
          disabled={disabled}
        >
          <SparklesIcon size={16} />
          <span>{disabled ? 'Analyzing…' : 'Analyze Bug'}</span>
        </button>
      </div>
      {error && (
        <p className="jira-input__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
