import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './lib/auth-context';
import { AuthModalProvider } from './lib/auth-modal-context';
import { SavedProductsProvider } from './lib/saved-products-context';
import { ToastProvider, useToast } from './lib/toast-context';
import NavBar from './components/NavBar';
import { ToastContainer } from './components/Toast';
import HomePage from './features/home/HomePage';
import BrowsePage from './features/browse/BrowsePage';
import SearchPage from './features/search/SearchPage';
import PlaygroundPage from './features/playground/PlaygroundPage';
import ChatPage from './features/chat/ChatPage';
import ShoppingListPage from './features/list/ShoppingListPage';
import SignInPage from './features/auth/SignInPage';
import SignUpPage from './features/auth/SignUpPage';

function AppToastContainer() {
  const { toasts, dismiss } = useToast();
  return <ToastContainer toasts={toasts} onDismiss={dismiss} />;
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <NavBar />
      <Outlet />
      <AppToastContainer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthModalProvider>
          <SavedProductsProvider>
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
                  <Route path="/list" element={<ShoppingListPage />} />
                  <Route path="/playground" element={<PlaygroundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </SavedProductsProvider>
        </AuthModalProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
