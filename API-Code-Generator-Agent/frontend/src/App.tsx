import { Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCode2,
  FolderKanban,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Code2,
} from 'lucide-react';
import { useTheme } from './theme';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Projects from './pages/Projects';
import History from './pages/History';
import Settings from './pages/Settings';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/generate', label: 'Generate Tests', icon: FileCode2 },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white px-3 py-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Code2 size={18} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">API Code Generator</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Swagger Assistant</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h1 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              API Test Generation Platform
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Developed by Srimannarayana Kode
            </span>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
