import { CONFIG } from 'src/config-global';
import { BookmarksView } from 'src/sections/bookmarks';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Bookmarks - ${CONFIG.appName}`}</title>
      <BookmarksView />
    </>
  );
}
