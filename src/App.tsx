import { useEffect } from 'react';
import { AppRoutes } from '@/routes/AppRoutes';
import { useUIStore } from '@/stores/uiStore';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}

export default App;
