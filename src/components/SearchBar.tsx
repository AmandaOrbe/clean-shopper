import { useState, type FormEvent } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [input, setInput] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSearch(input.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search a product (e.g. CeraVe Moisturizing Cream)..."
        disabled={isLoading}
        aria-label="Product search"
      />
      <button type="submit" disabled={isLoading || !input.trim()}>
        {isLoading ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}
