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
