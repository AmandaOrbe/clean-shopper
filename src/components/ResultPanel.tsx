interface ResultPanelProps {
  result: string;
  isLoading: boolean;
  error: string | null;
  query: string;
}

export function ResultPanel({ result, isLoading, error, query }: ResultPanelProps) {
  if (!query && !isLoading) return null;

  if (error) {
    return (
      <div className="result-panel error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="result-panel">
      {query && <h2>Analysis: {query}</h2>}
      {isLoading && !result && <p className="loading">Researching product...</p>}
      {result && (
        <div className="result-content">
          <p style={{ whiteSpace: "pre-wrap" }}>{result}</p>
          {isLoading && <span className="cursor">▍</span>}
        </div>
      )}
    </div>
  );
}
