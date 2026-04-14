import { client } from 'src/client/client.gen';
import { getAuthHeaders } from 'src/lib/client-config';
import {
  listAnalysesApiAnalysesGet,
  createAnalysisApiAnalysesPost,
  getAnalysisApiAnalysesAnalysisIdGet,
  updateAnalysisApiAnalysesAnalysisIdPut,
  deleteAnalysisApiAnalysesAnalysisIdDelete,
  shareAnalysisApiAnalysesAnalysisIdSharePost,
  unshareAnalysisApiAnalysesAnalysisIdShareUserIdDelete,
  uploadAnalysisImageApiAnalysesImagesUploadPost,
  getPositionsByCurrencyApiReportPositionsByCurrencyGet,
  getReportApiReportGet,
  readUsersMeApiUsersMeGet,
} from 'src/client/sdk.gen';
import {
  type AnalysisResponseWithShares,
  type AnalysisResponse,
  type ReportResponse,
} from 'src/client/types.gen';

export interface Analysis {
  id: number;
  title: string;
  pair: string | null;
  timeframe: string | null;
  content: string;
  pinned?: boolean;
  pin_order?: number;
  created_at: string;
  updated_at: string;
  owner_id: number;
  is_shared?: boolean;
  shared_by_user?: { username: string; avatar: string };
  shares?: AnalysisShare[];
}

export interface AnalysisShare {
  id: number;
  analysis_id: number;
  shared_with_user_id: number;
  shared_by_user_id: number;
  created_at: string;
  shared_by_user: { id: number; username: string; avatar: string };
  shared_with_user: { id: number; username: string; avatar: string };
}

export interface AnalysisCreate {
  title: string;
  pair?: string | null;
  timeframe?: string | null;
  content: string;
}

export interface AnalysisUpdate {
  title?: string;
  pair?: string | null;
  timeframe?: string | null;
  content?: string;
  pinned?: boolean;
  pin_order?: number;
}

const getBaseUrl = (): string => (client.getConfig().baseUrl as string) || '';

export const analysisApi = {
  list: async (): Promise<Analysis[]> => {
    const response = await listAnalysesApiAnalysesGet();
    return (response.data || []) as Analysis[];
  },

  create: async (data: AnalysisCreate): Promise<Analysis> => {
    const response = await createAnalysisApiAnalysesPost({
      body: data,
    });
    return response.data as Analysis;
  },

  get: async (id: number): Promise<Analysis> => {
    const response = await getAnalysisApiAnalysesAnalysisIdGet({
      path: { analysis_id: id },
    });
    return response.data as Analysis;
  },

  update: async (id: number, data: AnalysisUpdate): Promise<Analysis> => {
    const response = await updateAnalysisApiAnalysesAnalysisIdPut({
      path: { analysis_id: id },
      body: data,
    });
    return response.data as Analysis;
  },

  delete: async (id: number): Promise<void> => {
    await deleteAnalysisApiAnalysesAnalysisIdDelete({
      path: { analysis_id: id },
    });
  },

  share: async (id: number, userIds: number[]): Promise<any> => {
    const response = await shareAnalysisApiAnalysesAnalysisIdSharePost({
      path: { analysis_id: id },
      body: { user_ids: userIds },
    });
    return response.data;
  },

  unshare: async (id: number, userId: number): Promise<void> => {
    await unshareAnalysisApiAnalysesAnalysisIdShareUserIdDelete({
      path: { analysis_id: id, user_id: userId },
    });
  },

  pin: async (id: number, pinned: boolean): Promise<boolean> => {
    const res = await fetch(`${getBaseUrl()}/api/analyses/${id}/pin`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    if (!res.ok) throw new Error('Pin failed');
    const data = await res.json();
    return data.pinned as boolean;
  },

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const response = await uploadAnalysisImageApiAnalysesImagesUploadPost({
      body: { file },
    });
    return response.data as { url: string };
  },

  getImageUrl: (path: string): string => {
    if (path.startsWith('http')) return path;
    return `${getBaseUrl()}${path}`;
  },

  /** Download the analysis as a standalone .md file with all images embedded as base64. */
  exportMarkdown: async (analysis: Analysis): Promise<void> => {
    // Find all image URLs in the content: ![alt](url)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let content = analysis.content;
    const replacements: Array<{ original: string; alt: string; url: string }> = [];

    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(analysis.content)) !== null) {
      replacements.push({ original: match[0], alt: match[1], url: match[2] });
    }

    // Fetch each image and replace with base64
    await Promise.all(
      replacements.map(async ({ original, alt, url }) => {
        try {
          const absoluteUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
          const res = await fetch(absoluteUrl, { headers: getAuthHeaders() });
          if (!res.ok) return;
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          content = content.replace(original, `![${alt}](${base64})`);
        } catch {
          // leave original URL if fetch fails
        }
      })
    );

    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${analysis.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

// ============================================================================
// Multi-Currency Report and Position APIs
// ============================================================================

export interface CurrencyPosition {
  trades: any[];
  total: number;
  count: number;
}

export interface PositionsByCurrency {
  account_currency: string;
  total_pnl: number;
  positions_by_currency: Record<string, CurrencyPosition>;
}

export interface CurrencyReport {
  total_profit: number;
  total_loss: number;
  win_probability: number;
  loss_probability: number;
  avg_win: number;
  avg_loss: number;
  expectancy: number;
  capital: number;
  account_currency: string;
  total_pnl: number;
  num_trades: number;
}

export const positionApi = {
  /**
   * Get positions grouped by currency
   * Shows P&L for each trade currency with conversion to account currency
   */
  getPositionsByCurrency: async (): Promise<PositionsByCurrency> => {
    const response = await getPositionsByCurrencyApiReportPositionsByCurrencyGet();
    return response.data as unknown as PositionsByCurrency;
  },

  /**
   * Get complete report with multi-currency support
   * All P&L values converted to account currency
   */
  getCurrencyReport: async (): Promise<ReportResponse> => {
    const response = await getReportApiReportGet();
    return response.data!;
  },
};
