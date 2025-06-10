import './style.css';
import { Layout } from './components/layout';
import { IndexingComponent } from './components/IndexingComponent';
import Config from './config';

// Initialize the layout for the indexing page
new Layout({
  title: 'Add Photos - Hachi',
  currentPage: '/indexing.html',
  showNavbar: true
});

// Initialize the indexing component
document.addEventListener('DOMContentLoaded', () => {
  const indexingRoot = document.getElementById('indexing-root');
  
  if (indexingRoot) {
    // Clear loading spinner
    indexingRoot.innerHTML = '';
    
    // Create and mount the indexing component
    new IndexingComponent({
      root: indexingRoot,
      apiUrl: Config.apiUrl
    });
  }
});
