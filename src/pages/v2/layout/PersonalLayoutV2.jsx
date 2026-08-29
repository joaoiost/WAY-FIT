import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarV2 from './Sidebar';
import HeaderV2 from './Header';

export default function PersonalLayoutV2() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="v2-scope min-h-screen flex bg-ink-50">
      <SidebarV2 mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderV2 onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
