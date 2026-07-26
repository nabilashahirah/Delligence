import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-brand-muted">
      <Sidebar />
      {/* pt-14 on mobile to clear the fixed top bar; lg:pt-0 resets it */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {/* Every page is centered within a sensible max width so content
            fills wide screens without stretching edge-to-edge on ultra-wide.
            Individual pages should NOT set their own max-w-6xl/7xl anymore. */}
        <div className="w-full max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
