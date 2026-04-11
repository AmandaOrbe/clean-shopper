import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import NavBar from './components/NavBar';
import BrowsePage from './features/browse/BrowsePage';
import SearchPage from './features/search/SearchPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-100">
        <NavBar />
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
