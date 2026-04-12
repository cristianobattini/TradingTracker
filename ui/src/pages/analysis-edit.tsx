import { CONFIG } from 'src/config-global';
import { AnalysisCreateView } from 'src/sections/analysis';

export default function AnalysisEditPage() {
  return (
    <>
      <title>{`Edit Analysis - ${CONFIG.appName}`}</title>
      <AnalysisCreateView />
    </>
  );
}
