import { CONFIG } from 'src/config-global';
import { TradesView } from 'src/sections/trades/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Trades - ${CONFIG.appName}`}</title>

      <TradesView />
    </>
  );
}
