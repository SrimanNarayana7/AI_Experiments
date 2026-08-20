import { Footer, Header, Main } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard/Dashboard';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <Main>
        <Dashboard />
      </Main>
      <Footer />
    </div>
  );
}
