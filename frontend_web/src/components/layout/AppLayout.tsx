import { Outlet } from 'react-router-dom';
import { NavigationSidebar } from './NavigationSidebar';

export function AppLayout() {
  return (
    <div className="flex flex-row w-full h-svh bg-background">
      <NavigationSidebar />
      <Outlet />
    </div>
  );
}
