import './style.css';
import { Layout } from './components/layout';
import { endpoints } from './config';
import { fetchWithSession } from './utils';

// Initialize the layout for the main page
new Layout({
  title: 'Hachi - Photo Management System',
  currentPage: '/',
  showNavbar: true
});

// API endpoint for statistics
const GET_META_STATS_URL = endpoints.GET_META_STATS;

// Interface for indexing statistics
export interface IndexingStats {
    image: {
        count: number;
        unique_people_count: number;
        unique_place_count: number;
    }
}

// Helper to set stat text content directly (no animations / delays)
function setStat(id: string, value: number) {
  const el = document.getElementById(id);
  if (el) el.textContent = value.toLocaleString();
}

// Function to fetch and display statistics (simplified - no animations)
async function loadStats() {
  try {
    const response = await fetchWithSession(GET_META_STATS_URL);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const stats: IndexingStats = await response.json();
    setStat('total-images', stats.image.count);
    setStat('total-people', stats.image.unique_people_count);
    setStat('total-locations', stats.image.unique_place_count);
  } catch (error) {
    console.warn('Failed to load statistics:', error);
    // Fallback sample values
    setStat('total-images', 1247);
    setStat('total-people', 23);
    setStat('total-locations', 15);
  }
}

// Initialize stats when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
});

console.log('Hachi main page initialized (animations removed)');
