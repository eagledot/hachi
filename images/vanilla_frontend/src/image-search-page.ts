import './style.css';
import { Layout } from './components/layout';
import { ImageSearchApp } from './image-search';

// Initialize the layout for the image search page
new Layout({
  title: 'Image Search - Hachi',
  currentPage: '/image-search.html',
  showNavbar: true
});

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing ImageSearch app");
  // Create global instance
  (window as any).imageSearchApp = new ImageSearchApp();
});
