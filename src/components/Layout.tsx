import { NavLink, Outlet } from 'react-router-dom'
import { Home, BookOpen, ClipboardCheck, Bookmark, User } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/learn', icon: BookOpen, label: '学习' },
  { to: '/quiz', icon: ClipboardCheck, label: '测验' },
  { to: '/notebook', icon: Bookmark, label: '单词本' },
  { to: '/profile', icon: User, label: '我的' }
]

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen min-h-dvh">
      <main className="flex-1 overflow-y-auto pb-20 safe-area-top">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-surface-light)] safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  isActive
                    ? 'text-[var(--color-primary-light)]'
                    : 'text-[var(--color-text-muted)]'
                }`
              }
            >
              <Icon size={22} />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
