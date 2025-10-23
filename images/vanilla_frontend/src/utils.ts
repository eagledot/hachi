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
  const response = await fetchWithSession(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  const data = await response.json();
  return data;
}

export async function collectAttributeMeta(token: string, pageId: number): Promise<any> {
  const endpoint = endpoints.COLLECT_ATTRIBUTE_META(token, pageId);
  const response = await fetchWithSession(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  const data = await response.json();
  return data;
}


export async function filterPopulateQuery(queryToken: string, attribute: string): Promise<any> {
  const endpoint = endpoints.FILTER_POPULATE_QUERY(queryToken, attribute);
  const response = await fetchWithSession(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
  const data = await response.json();
  return data;
}

export function fitTiles(
  height: number,
  width: number,
  minSide: number,
  gap: number = 3
): { rows: number; cols: number; tileWidth: number; tileHeight: number } {

  const rows = Math.floor((height) / (minSide + gap));
  const cols = Math.floor((width) / (minSide + gap));

  // Check the remaining space after placing the tiles
  const remainingHeight = height - (rows * (minSide + gap)) + gap;
  const remainingWidth = width - (cols * (minSide + gap)) + gap;

  // Now add the remaining space evenly to each tile
  const tileHeight = minSide + (remainingHeight / rows);
  const tileWidth = minSide + (remainingWidth / cols);

  return { rows, cols, tileWidth, tileHeight };
}

export function createElementFromString(htmlString: string): Element | null {
  const template = document.createElement("template");
  template.innerHTML = htmlString.trim();
  const element = template.content.firstElementChild;
  return element;
}


export async function filterQueryMeta(queryToken: string, attribute: string, value: string): Promise<any> {
  const endpoint = endpoints.FILTER_QUERY_META(queryToken, attribute, value);
  const response = await fetchWithSession(endpoint);
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


function generateSessionKey(): string {
  // Generate a random session key (you can customize this logic)
  return Math.random().toString(36).substring(2);
}

export async function fetchWithSession(input: RequestInfo, init: RequestInit = {}) {
  let sessionKey = localStorage.getItem('sessionKey');
  if (!sessionKey) {
    // If there is no session key, create one and save it in localStorage
    sessionKey = generateSessionKey();
    localStorage.setItem('sessionKey', sessionKey);
  }

  // Add it to the request headers
  init.headers = {
    ...init.headers,
    'X-Session-Key': sessionKey!
  };
  return fetch(input, init);
}

export function turnHTMLToElement(rawHTML: string): Element | null {
    const template = document.createElement("template");
    template.innerHTML = rawHTML.trim();
    // Raise a warning if there's no firstElementChild or multiple root elements
    if (!template.content.firstElementChild) {
        console.warn("No root element found in the provided HTML.");
    }
    if (template.content.childElementCount > 1) {
        console.warn("Multiple root elements found. Only the first will be returned.");
    }
    return template.content.firstElementChild;
}