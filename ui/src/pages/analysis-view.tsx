import { CONFIG } from 'src/config-global';
import { AnalysisFullscreenView } from 'src/sections/analysis/analysis-fullscreen-view';

export default function AnalysisViewPage() {
  return (
    <>
      <title>{`Analysis - ${CONFIG.appName}`}</title>
      <AnalysisFullscreenView />
    </>
  );
}
