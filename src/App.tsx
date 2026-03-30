import { SearchBar } from "./components/SearchBar";
import { ResultPanel } from "./components/ResultPanel";
import { useProductResearch } from "./hooks/useProductResearch";
import "./App.css";

function App() {
  const { query, isLoading, result, error, research } = useProductResearch();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Clean Shopper</h1>
        <p>AI-powered product research for clean, non-toxic living</p>
      </header>
      <main className="app-main">
        <SearchBar onSearch={research} isLoading={isLoading} />
        <ResultPanel
          result={result}
          isLoading={isLoading}
          error={error}
          query={query}
        />
      </main>
    </div>
  );
}

export default App;
