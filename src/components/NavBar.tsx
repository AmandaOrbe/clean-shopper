import { Link, useLocation } from 'react-router-dom';
import { MagnifyingGlass, Rows, BookmarkSimple, ShoppingCart } from '@phosphor-icons/react';

// ─── Nav Items (V1) ───────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Search',        route: '/search',   icon: MagnifyingGlass },
  { label: 'Browse',        route: '/browse',   icon: Rows            },
  { label: 'My Library',    route: '/library',  icon: BookmarkSimple  },
  { label: 'Shopping List', route: '/list',     icon: ShoppingCart    },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

const NavBar = () => {
  const { pathname } = useLocation();

  return (
    <nav className="bg-neutral-50 border-b border-neutral-200 px-space-2xl py-space-md flex items-center justify-between">
      {/* ── App name ── */}
      <Link to="/" className="text-h3 text-primary font-bold no-underline">
        Clean Shopper
      </Link>

      {/* ── Nav links ── */}
      <ul className="flex items-center gap-space-xl list-none m-0 p-0">
        {NAV_ITEMS.map(({ label, route, icon: Icon }) => {
          const isActive = pathname === route;
          return (
            <li key={route}>
              <Link
                to={route}
                className={[
                  'inline-flex items-center gap-space-xs text-body transition-colors duration-150 no-underline',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900',
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
    </nav>
  );
};

export default NavBar;
