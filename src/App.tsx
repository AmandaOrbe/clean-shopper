import './App.css'
import NavBar from './components/NavBar'
import ProductCard from './components/ProductCard'
import CategoryTag from './components/CategoryTag'
import SafetyBadge from './components/SafetyBadge'

function App() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <NavBar activeRoute={window.location.pathname} />

      <main className="p-space-2xl">
        <div className="grid grid-cols-1 gap-space-xl max-w-xl">

          {/* ── Sample data card ── */}
          <ProductCard
            name="Dr. Bronner's Pure Castile Soap"
            safetyRating="clean"
            safetyScore={92}
            category="Personal Care"
            description="Organic, fair trade, no synthetic preservatives or detergents."
            onClick={() => {}}
          />

          {/* ── Caution state ── */}
          <ProductCard
            name="Neutrogena Hydro Boost Water Gel"
            safetyRating="caution"
            safetyScore={58}
            category="Moisturizer"
            description="Hyaluronic acid-based gel with good hydration performance, but contains a few ingredients flagged at moderate concern by EWG."
            onClick={() => {}}
          />

          {/* ── Avoid state ── */}
          <ProductCard
            name="St. Ives Apricot Scrub"
            safetyRating="avoid"
            safetyScore={22}
            category="Exfoliant"
            description="Contains walnut shell powder with sharp edges linked to micro-tears, plus several synthetic fragrance compounds rated high concern."
          />

          {/* ── Loading state ── */}
          <ProductCard
            name=""
            safetyRating="clean"
            category=""
            description=""
            isLoading={true}
          />

        </div>

        {/* ── Component showcase ── */}
        <div className="mt-space-2xl max-w-xl">
          <h2 className="text-h2 text-neutral-900 mb-space-lg">SafetyBadge</h2>
          <div className="flex gap-space-md mb-space-2xl">
            <SafetyBadge rating="clean" />
            <SafetyBadge rating="caution" />
            <SafetyBadge rating="avoid" />
            <SafetyBadge rating="clean" size="sm" />
            <SafetyBadge rating="caution" size="sm" />
            <SafetyBadge rating="avoid" size="sm" />
          </div>

          <h2 className="text-h2 text-neutral-900 mb-space-lg">CategoryTag</h2>
          <div className="flex flex-wrap gap-space-sm">
            <CategoryTag label="Personal Care" />
            <CategoryTag label="Moisturizer" />
            <CategoryTag label="Cleaning" isActive />
            <CategoryTag label="Exfoliant" onClick={() => {}} />
            <CategoryTag label="Sunscreen" isActive onClick={() => {}} />
          </div>
        </div>

      </main>
    </div>
  )
}

export default App
