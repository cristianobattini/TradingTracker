import 'src/global.css';

import { useEffect, useState } from 'react';

import Fab from '@mui/material/Fab';

import { usePathname, useRouter } from 'src/routes/hooks';

import { ThemeProvider } from 'src/theme/theme-provider';

import { Iconify } from 'src/components/iconify';

import { readUsersMeApiUsersMeGet } from 'src/client';
import { getLocalStorageItem } from './services/local-storage-service';
import { getAuthHeaders } from './lib/client-config';

import { client } from './client/client.gen';

// ----------------------------------------------------------------------

type AppProps = {
  children: React.ReactNode;
};

client.setConfig({
  baseUrl: 'https://vmtrbc01b.northeurope.cloudapp.azure.com',
  // baseUrl: 'http://localhost:8000',
  auth: (auth) => {
    const token = getLocalStorageItem('accessToken');
    return token ? `${token}` : undefined;
  }
});


export default function App({ children }: AppProps) {
  useScrollToTop();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getLocalStorageItem('accessToken');
      
      // If no token and not on sign-in page, redirect to sign-in
      if (!token) {
        if (pathname !== '/sign-in') {
          router.push('/sign-in');
        }
        setIsCheckingAuth(false);
        return;
      }

      try {
        // Use the auth headers for the API call
        const response = await readUsersMeApiUsersMeGet({
          headers: getAuthHeaders()
        });
        
        if (response.error) {
          // Token is invalid or expired
          console.error('Auth error:', response.error);
          if (pathname !== '/sign-in') {
            router.push('/sign-in');
          }
        }
        // If successful, user stays on current page
      } catch (error) {
        console.error('Auth check failed:', error);
        if (pathname !== '/sign-in') {
          router.push('/sign-in');
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  // Show loading state while checking authentication
  if (isCheckingAuth && pathname !== '/sign-in') {
    return (
      <ThemeProvider>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <div>Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

/*   const githubButton = () => (
    <Fab
      size="medium"
      aria-label="Github"
      href="https://github.com/minimal-ui-kit/material-kit-react"
      sx={{
        zIndex: 9,
        right: 20,
        bottom: 20,
        width: 48,
        height: 48,
        position: 'fixed',
        bgcolor: 'grey.800',
      }}
    >
      <Iconify width={24} icon="socials:github" sx={{ '--color': 'white' }} />
    </Fab>
  ); */

  return (
    <ThemeProvider>
      {children}
{/*       {githubButton()} */}
    </ThemeProvider>
  );
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
