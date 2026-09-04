import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export interface SidebarLink {
  to: string;
  label: string;
  icon?: ReactNode;
  /** Exact-match only (e.g. index routes) rather than NavLink's default prefix match. */
  end?: boolean;
}

export interface SidebarProps {
  links: SidebarLink[];
  footer?: ReactNode;
  /** Accent used for the active-link indicator — carries each role's
   * subtle identity (docs/design-system.md §8) without four different themes. */
  accentClassName?: string;
}

/**
 * Desktop/tablet-oriented navigation rail (dispatcher, admin). Active state
 * is communicated by background + a left accent bar + bold text — never by
 * color alone (docs/ux-guidelines.md "Navigation principles").
 */
export function Sidebar({ links, footer, accentClassName = "bg-primary" }: SidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-graphite-800 bg-graphite-950 text-graphite-300">
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-body transition-colors duration-150 ${
                isActive
                  ? "bg-graphite-900 font-semibold text-white"
                  : "text-graphite-400 hover:bg-graphite-900/60 hover:text-graphite-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-r transition-all duration-150 ${
                    isActive ? `w-[3px] ${accentClassName}` : "w-0"
                  }`}
                />
                {link.icon && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                    {link.icon}
                  </span>
                )}
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {footer && <div className="border-t border-graphite-800 p-3">{footer}</div>}
    </aside>
  );
}
