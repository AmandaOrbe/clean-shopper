import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Rows, BookmarkSimple, ShoppingCart, ChatCircle } from '@phosphor-icons/react';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

// ─── Nav Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Chat',          route: '/chat',     icon: ChatCircle      },
  { label: 'Search',        route: '/search',   icon: MagnifyingGlass },
  { label: 'Browse',        route: '/browse',   icon: Rows            },
  { label: 'My Library',    route: '/library',  icon: BookmarkSimple  },
  { label: 'Shopping List', route: '/list',     icon: ShoppingCart    },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

const NavBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <nav className="bg-primary-dark px-space-2xl py-space-md flex items-center gap-space-xl">
      {/* ── App name ── */}
      <Link to="/" className="text-h3 text-neutral-50 font-bold no-underline">
        Clean Shopper
      </Link>

      {/* ── Nav links ── */}
      <ul className="ml-auto flex items-center gap-space-xl list-none m-0 p-0">
        {NAV_ITEMS.map(({ label, route, icon: Icon }) => {
          const isActive = pathname === route;
          return (
            <li key={route}>
              <Link
                to={route}
                className={[
                  'inline-flex items-center gap-space-xs text-body transition-colors duration-150 no-underline',
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-white/70 hover:text-white',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={16} weight={isActive ? 'bold' : 'regular'} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Auth ── */}
      {session ? (
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center text-small font-semibold text-white/80 hover:text-accent px-space-md py-space-xs rounded-full hover:bg-white/10 transition-colors"
        >
          Log out
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center text-small font-semibold text-white/80 hover:text-accent px-space-md py-space-xs rounded-full border border-white/20 hover:border-accent/40 transition-colors"
        >
          Log in
        </button>
      )}
    </nav>
  );
};

export default NavBar;
