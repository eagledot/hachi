import { endpoints } from "./config";

/**
 * Tagged template function for rendering HTML strings.
 * Allows writing HTML in a more readable way with template literals.
 * 
 * @example
 * const content = html`
 *   <div class="container">
 *     <h1>${title}</h1>
 *     <p>${description}</p>
 *   </div>
 * `;
 */
export function html(strings: TemplateStringsArray, ...values: any[]): string {
  let str = '';
  strings.forEach((string, i) => {
    str += string;
    if (i < values.length) {
      const value = values[i];
      // Handle arrays by joining them, otherwise just append the value
      // You might want to add more sophisticated handling here, e.g., for escaping
      if (Array.isArray(value)) {
        str += value.join('');
      } else {
        str += value;
      }
    }
  });
  return str;
}



interface IQueryAttribute {
  n_matches?: number;
  n_pages?: number;
  query_token?: string;
}


export async function queryAttribute(attribute: string, value: string, pageSize: number): Promise<IQueryAttribute> {
  const endpoint = endpoints.QUERY_ATTRIBUTE(attribute, value, pageSize);
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  const data = await response.json();
  return data;
}

export async function collectAttributeMeta(token: string, pageId: number): Promise<any> {
  const endpoint = endpoints.COLLECT_ATTRIBUTE_META(token, pageId);
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  const data = await response.json();
  return data;
}


export async function filterPopulateQuery(queryToken: string, attribute: string): Promise<any> {
  const endpoint = endpoints.FILTER_POPULATE_QUERY(queryToken, attribute);
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  const data = await response.json();
  return data;
}

export function fitTiles(
  height: number,
  width: number,
  minSide: number
): { rows: number; cols: number; tileWidth: number; tileHeight: number } {
  const rows = Math.ceil(height / minSide);
  const cols = Math.ceil(width / minSide);

  const tileHeight = height / rows;
  const tileWidth = width / cols;

  return { rows, cols, tileWidth, tileHeight };
}


export async function filterQueryMeta(queryToken: string, attribute: string, value: string): Promise<any> {
  const endpoint = endpoints.FILTER_QUERY_META(queryToken, attribute, value);
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  const data = await response.json();
  return data;
}

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).html = html;
}

// Add global type declaration for TypeScript
declare global {
  interface Window {
    html: typeof html;
  }
}
