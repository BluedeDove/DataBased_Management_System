export type AppRole = 'admin' | 'librarian' | 'teacher' | 'student' | 'machine'

export function getHomeRoute(role?: string): string {
  switch (role as AppRole | undefined) {
    case 'admin':
    case 'librarian':
      return '/dashboard'
    case 'machine':
      return '/machine-terminal'
    case 'teacher':
    case 'student':
    default:
      return '/ai-assistant'
  }
}

