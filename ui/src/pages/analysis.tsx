import { CONFIG } from 'src/config-global';
import { AnalysisDashboardView } from 'src/sections/analysis';

export default function AnalysisPage() {
  return (
    <>
      <title>{`Analysis Journal - ${CONFIG.appName}`}</title>
      <AnalysisDashboardView />
    </>
  );
}
