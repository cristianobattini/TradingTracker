import { CONFIG } from 'src/config-global';
import { AnalysisCreateView } from 'src/sections/analysis';

export default function AnalysisCreatePage() {
  return (
    <>
      <title>{`New Analysis - ${CONFIG.appName}`}</title>
      <AnalysisCreateView />
    </>
  );
}
