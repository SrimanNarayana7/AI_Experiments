export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Configuration is managed via backend environment variables.
      </p>
      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">LangFlow</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Set <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">LANGFLOW_BASE_URL</code>,{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">LANGFLOW_FLOW_ID</code>, and{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">LANGFLOW_API_KEY</code> in the backend{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">.env</code>.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Toggle light and dark mode from the moon/sun icon in the header.
          </p>
        </div>
      </div>
    </div>
  );
}
