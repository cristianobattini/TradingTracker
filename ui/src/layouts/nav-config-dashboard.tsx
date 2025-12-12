import { enableCompileCache } from 'module';
import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';
import { getLocalStorageItem } from 'src/services/local-storage-service';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  enabled: boolean;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const navData = [
  {
    title: 'Dashboard',
    enabled: true,
    path: '/',
    icon: icon('ic-dashboard'),
  },
  {
    title: 'Trades',
    enabled: true,
    path: '/trades',
    icon: icon('ic-analytics'),
  },
  {
    title: 'AI',
    enabled: true,
    path: '/ai',
    icon: icon('ic-star'),
  },
  {
    title: 'Profile',
    enabled: true,
    path: '/profile',
    icon: icon('ic-profile'),
  },
  {
    title: 'Users',
    enabled: getLocalStorageItem('role') == 'admin',
    path: '/user',
    icon: icon('ic-users'),
  },
];
