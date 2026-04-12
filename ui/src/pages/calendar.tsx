import { CONFIG } from 'src/config-global';
import { CalendarEventsView } from 'src/sections/calendar-events';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Economic Calendar - ${CONFIG.appName}`}</title>
      <CalendarEventsView />
    </>
  );
}
