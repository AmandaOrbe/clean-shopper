import './App.css'
import NavBar from './components/NavBar'
import BrowsePage from './features/browse/BrowsePage'

function App() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <NavBar activeRoute={window.location.pathname} />
      <BrowsePage />
    </div>
  )
}

export default App
