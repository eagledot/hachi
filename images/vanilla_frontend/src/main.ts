import './style.css';
import { Layout } from './components/layout';
import Config, { endpoints } from './config';
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

// Animate counter function with enhanced easing
function animateCounter(elementId: string, finalValue: number, duration: number = 2000) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const startTime = performance.now();
  const startValue = 0;

  // Add loading state
  element.classList.add('loading-pulse');
  element.textContent = '...';

  function updateCounter(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Enhanced easing function for smoother animation
    const easeOutQuint = 1 - Math.pow(1 - progress, 5);
    const currentValue = Math.floor(startValue + (finalValue - startValue) * easeOutQuint);
    
    if (element) {
      element.textContent = currentValue.toLocaleString();
      
      // Add special effects for milestone numbers
      if (currentValue > 0 && currentValue % 100 === 0 && progress < 0.9) {
        element.style.transform = 'scale(1.1)';
        setTimeout(() => {
          if (element) element.style.transform = 'scale(1)';
        }, 150);
      }
    }
    
    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      // Remove loading state and add completion effect
      element?.classList.remove('loading-pulse');
      element?.classList.add('animate-pulse');
      setTimeout(() => {
        element?.classList.remove('animate-pulse');
      }, 1000);
    }
  }

  // Add slight delay for better UX
  setTimeout(() => {
    requestAnimationFrame(updateCounter);
  }, 300);
}

// Function to fetch and display statistics
async function loadStats() {
  try {
    const response = await fetchWithSession(GET_META_STATS_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const stats: IndexingStats = await response.json();
    
    // Update the counters with real data and staggered animations
    setTimeout(() => animateCounter('total-images', stats.image.count), 0);
    setTimeout(() => animateCounter('total-people', stats.image.unique_people_count), 200);
    setTimeout(() => animateCounter('total-locations', stats.image.unique_place_count), 400);
  } catch (error) {
    console.warn('Failed to load statistics:', error);
    
    // Fallback to showing sample values for demo
    const fallbackStats = {
      totalImages: 1247,
      totalPeople: 23,
      totalLocations: 15
    };
    
    setTimeout(() => animateCounter('total-images', fallbackStats.totalImages), 0);
    setTimeout(() => animateCounter('total-people', fallbackStats.totalPeople), 200);
    setTimeout(() => animateCounter('total-locations', fallbackStats.totalLocations), 400);
  }
}

// Add interactive enhancements
function addInteractiveEnhancements() {
  // Add parallax effect to hero background elements
  const backgroundElements = document.querySelectorAll('.absolute');
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    backgroundElements.forEach((element, index) => {
      const rate = scrolled * -0.5 * (index + 1) * 0.2;
      (element as HTMLElement).style.transform = `translateY(${rate}px)`;
    });
  });

  // Add intersection observer for fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        entry.target.classList.remove('opacity-0', 'translate-y-8');
      }
    });
  }, observerOptions);

  // Observe feature cards and stats section
  document.querySelectorAll('.group, section').forEach(el => {
    el.classList.add('opacity-0', 'translate-y-8', 'transition-all', 'duration-700');
    observer.observe(el);
  });

  // Add hover sound effect (optional - can be enabled/disabled)
  const actionButtons = document.querySelectorAll('a[href*=".html"]');
  actionButtons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      // Could add subtle sound effect here
      button.classList.add('animate-pulse');
      setTimeout(() => {
        button.classList.remove('animate-pulse');
      }, 200);
    });
  });
}

// Initialize stats when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Add interactive enhancements first
  addInteractiveEnhancements();
  
  // Add a small delay for better UX and let initial animations settle
  setTimeout(() => {
    loadStats();
  }, 800);
});

console.log('Hachi main page initialized');
