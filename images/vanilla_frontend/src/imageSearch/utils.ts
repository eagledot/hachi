// Helper functions for search query construction and data transformation
import type { HachiImageData, ImageSearchResponse } from './types';

/**
 * Constructs a query string from a search term
 */
export function constructQueryString(term: string): string {
  if (!term.trim()) return '';

  const parts = term.split(' ').filter(part => part.length > 0);
  const metaParts: string[] = [];
  const plainTextParts: string[] = [];

  parts.forEach(part => {
    if (part.includes('=')) {
      metaParts.push(part);
    } else {
      plainTextParts.push(part);
    }
  });

  let queryString = metaParts.join('&');

  if (plainTextParts.length > 0) {
    const plainQuery = `query=${plainTextParts.join(' ')}`;
    if (queryString.length > 0) {
      queryString += `&${plainQuery}`;
    } else {
      queryString = plainQuery;
    }
  }
  return queryString;
}

/**
 * Transforms raw data from a single API response into HachiImageData array
 */
export function transformRawDataChunk(rawData: ImageSearchResponse): HachiImageData[] {
  if (!rawData.data_hash || !rawData.score || !rawData.meta_data ||
      !(rawData.data_hash.length === rawData.score.length && rawData.score.length === rawData.meta_data.length)) {
    console.error('Malformed rawData in transformRawDataChunk:', rawData);
    return [];
  }

  const fetchedPhotos: HachiImageData[] = rawData.data_hash.map((hash, index) => ({
    id: hash,
    score: parseFloat(rawData.score[index] as any),
    metadata: rawData.meta_data[index],
  }));
  return fetchedPhotos;
}

/**
 * Merges new photos with existing photos, accumulating scores and updating metadata
 */
export function mergePhotos(existingPhotos: HachiImageData[], newPhotos: HachiImageData[]): HachiImageData[] {
  if (!newPhotos || !newPhotos.length) {
    return existingPhotos
  }
  const updatedPhotosMap = new Map(existingPhotos.map(p => [p.id, { ...p }]));

  newPhotos.forEach(newPhoto => {
    if (updatedPhotosMap.has(newPhoto.id)) {
      const existingPhoto = updatedPhotosMap.get(newPhoto.id)!;
      // Accumulate scores
      existingPhoto.score = (Number(existingPhoto.score) || 0) + (Number(newPhoto.score) || 0);
      existingPhoto.metadata = newPhoto.metadata; // Update metadata
    } else {
      updatedPhotosMap.set(newPhoto.id, newPhoto);
    }
  });

  const combinedPhotos = Array.from(updatedPhotosMap.values());
  combinedPhotos.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  return combinedPhotos;
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => func(...args), delay);
  };
}
