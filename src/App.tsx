import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import NavBar from './components/NavBar';
import HomePage from './features/home/HomePage';
import BrowsePage from './features/browse/BrowsePage';
import SearchPage from './features/search/SearchPage';
import PlaygroundPage from './features/playground/PlaygroundPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-100">
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
