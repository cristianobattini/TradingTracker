import { CONFIG } from 'src/config-global';
import { AIView } from 'src/sections/ai';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`AI - ${CONFIG.appName}`}</title>

      <AIView />
    </>
  );
}
