import { CONFIG } from 'src/config-global';
import { NewsView } from 'src/sections/news';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Forex News - ${CONFIG.appName}`}</title>
      <NewsView />
    </>
  );
}
