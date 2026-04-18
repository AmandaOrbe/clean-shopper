import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './lib/auth-context';
import NavBar from './components/NavBar';
import HomePage from './features/home/HomePage';
import BrowsePage from './features/browse/BrowsePage';
import SearchPage from './features/search/SearchPage';
import PlaygroundPage from './features/playground/PlaygroundPage';
import ChatPage from './features/chat/ChatPage';
import SignInPage from './features/auth/SignInPage';
import SignUpPage from './features/auth/SignUpPage';

function AppLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <NavBar />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth pages — no NavBar */}
          <Route path="/login" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* App pages — NavBar via layout route */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
