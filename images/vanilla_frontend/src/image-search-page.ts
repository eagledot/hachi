import './style.css';
import { Layout } from './components/layout';
import { ImageSearchApp } from './image-search';

// Initialize the layout for the image search page
new Layout({
  title: 'Image Search - Hachi',
  currentPage: '/image-search.html',
  showNavbar: true
});

// Initialize the image search functionality
function initializeImageSearch() {
  try {
    new ImageSearchApp();
  } catch (error) {
    console.error('Failed to initialize image search:', error);
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeImageSearch);
} else {
  initializeImageSearch();
}

console.log('Image search page initialized');
