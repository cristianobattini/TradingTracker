import { client } from 'src/client/client.gen';
import { getAuthHeaders } from 'src/lib/client-config';

export interface Analysis {
  id: number;
  title: string;
  pair: string | null;
  timeframe: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  owner_id: number;
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
}

const getBaseUrl = (): string => (client.getConfig().baseUrl as string) || '';

export const analysisApi = {
  list: async (): Promise<Analysis[]> => {
    const response = await fetch(`${getBaseUrl()}/api/analyses/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch analyses');
    return response.json();
  },

  create: async (data: AnalysisCreate): Promise<Analysis> => {
    const response = await fetch(`${getBaseUrl()}/api/analyses/`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create analysis');
    return response.json();
  },

  get: async (id: number): Promise<Analysis> => {
    const response = await fetch(`${getBaseUrl()}/api/analyses/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch analysis');
    return response.json();
  },

  update: async (id: number, data: AnalysisUpdate): Promise<Analysis> => {
    const response = await fetch(`${getBaseUrl()}/api/analyses/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update analysis');
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${getBaseUrl()}/api/analyses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete analysis');
  },

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${getBaseUrl()}/api/analyses/images/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload image');
    return response.json();
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
