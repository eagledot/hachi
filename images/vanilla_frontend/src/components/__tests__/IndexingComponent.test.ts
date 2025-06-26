import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fireEvent, getByText, getByLabelText, getByRole, queryByText, waitFor } from '@testing-library/dom';
import { IndexingComponent } from '../IndexingComponent';

// Mock dependencies
vi.mock('../../services/indexing', () => ({
  default: {
    getPartitions: vi.fn().mockResolvedValue([
      { location: 'LOCAL', identifier: 'C:' },
      { location: 'LOCAL', identifier: 'D:' }
    ]),
    processDirectoryPath: (path: string) => path ? [path] : [],
    indexCancel: vi.fn()
  }
}));
vi.mock('../../config', () => ({
  endpoints: { INDEX_START: '/api/index/start' }
}));

// Mock fetch
const fetchMock = vi.fn();
(window as any).fetch = fetchMock;

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('IndexingComponent', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
    fetchMock.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the main UI elements', () => {
    new IndexingComponent({ root, apiUrl: '/api' });
    expect(root.querySelector('#directory-input')).toBeTruthy();
    expect(root.querySelector('#scan-btn')).toBeTruthy();
    expect(root.querySelector('#protocol-select')).toBeTruthy();
    expect(root.querySelector('#browse-btn')).toBeTruthy();
    expect(root.querySelector('#complete-rescan')).toBeTruthy();
    expect(root.querySelector('#simulate-indexing')).toBeTruthy();
  });

  it('enables scan button when directory is entered', async () => {
    new IndexingComponent({ root, apiUrl: '/api' });
    const input = root.querySelector('#directory-input') as HTMLInputElement;
    const scanBtn = root.querySelector('#scan-btn') as HTMLButtonElement;
    expect(scanBtn.disabled).toBe(true);
    input.value = 'C\\Photos';
    fireEvent.input(input);
    await waitFor(() => {
      expect(scanBtn.disabled).toBe(false);
    });
  });

  it('disables scan button when directory is empty', async () => {
    new IndexingComponent({ root, apiUrl: '/api' });
    const input = root.querySelector('#directory-input') as HTMLInputElement;
    const scanBtn = root.querySelector('#scan-btn') as HTMLButtonElement;
    input.value = '';
    fireEvent.input(input);
    await waitFor(() => {
      expect(scanBtn.disabled).toBe(true);
    });
  });

  it('starts indexing and shows success notification', async () => {
    // First call: INDEX_START
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ error: null })
    });
    // Second call: getIndexStatus
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ done: true })
    });

    new IndexingComponent({ root, apiUrl: '/api' });
    const input = root.querySelector('#directory-input') as HTMLInputElement;
    const scanBtn = root.querySelector('#scan-btn') as HTMLButtonElement;
    input.value = 'C\\Photos';
    fireEvent.input(input);
    await waitFor(() => {
      expect(scanBtn.disabled).toBe(false);
    });
    fireEvent.click(scanBtn);
    await flushPromises();
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Photo scan started successfully!');
    });
  });

  it('shows error notification if scan fails', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ error: true, details: 'Failed' })
    });
    new IndexingComponent({ root, apiUrl: '/api' });
    const input = root.querySelector('#directory-input') as HTMLInputElement;
    const scanBtn = root.querySelector('#scan-btn') as HTMLButtonElement;
    input.value = 'C\\Photos';
    fireEvent.input(input);
    await waitFor(() => {
      expect(scanBtn.disabled).toBe(false);
    });
    fireEvent.click(scanBtn);
    await flushPromises();
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Could not start scanning. Please check the folder path or service.');
    });
  });

  it('opens folder selector modal when browse is clicked', async () => {
    new IndexingComponent({ root, apiUrl: '/api' });
    const browseBtn = root.querySelector('#browse-btn') as HTMLButtonElement;
    fireEvent.click(browseBtn);
    await waitFor(() => {
      const modal = document.getElementById('folder-selector-modal');
      expect(modal).toBeTruthy();
      expect(modal?.classList.contains('hidden')).toBe(false);
    });
  });

  it('closes folder selector modal on cancel', async () => {
    new IndexingComponent({ root, apiUrl: '/api' });
    const browseBtn = root.querySelector('#browse-btn') as HTMLButtonElement;
    fireEvent.click(browseBtn);
    await waitFor(() => {
      const modal = document.getElementById('folder-selector-modal');
      expect(modal).toBeTruthy();
      expect(modal?.classList.contains('hidden')).toBe(false);
    });
    const modal = document.getElementById('folder-selector-modal');
    // Simulate click outside modal content
    fireEvent.click(modal!);
    await waitFor(() => {
      expect(modal?.classList.contains('hidden')).toBe(true);
    });
  });

  it('handles protocol select change', async () => {
    new IndexingComponent({ root, apiUrl: '/api' });
    const protocolSelect = root.querySelector('#protocol-select') as HTMLSelectElement;
    const input = root.querySelector('#directory-input') as HTMLInputElement;
    protocolSelect.value = 'google_photos';
    fireEvent.change(protocolSelect);
    await waitFor(() => {
      expect(input.value).toBe('google_photos');
    });
    protocolSelect.value = 'none';
    fireEvent.change(protocolSelect);
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('handles simulate indexing checkbox', async () => {
    new IndexingComponent({ root, apiUrl: '/api' });
    const simulateCheckbox = root.querySelector('#simulate-indexing') as HTMLInputElement;
    expect(simulateCheckbox.checked).toBe(false);
    simulateCheckbox.checked = true;
    fireEvent.change(simulateCheckbox);
    await waitFor(() => {
      expect(simulateCheckbox.checked).toBe(true);
    });
  });

  it('can cancel an ongoing scan', async () => {
    // 1. Start scan (INDEX_START)
    fetchMock.mockResolvedValueOnce({ json: async () => ({ error: null }) });
    // 2. First poll: scan in progress
    fetchMock.mockResolvedValueOnce({ json: async () => ({ done: false, processed: 0, total: 1, eta: 0, details: '' }) });
    // 3. Cancel scan (indexCancel)
    fetchMock.mockResolvedValueOnce({ json: async () => ({}) });
    // 4. Second poll: scan done
    fetchMock.mockResolvedValueOnce({ json: async () => ({ done: true }) });

    new IndexingComponent({ root, apiUrl: '/api' });
    const input = root.querySelector('#directory-input') as HTMLInputElement;
    const scanBtn = root.querySelector('#scan-btn') as HTMLButtonElement;
    input.value = 'C\\Photos';
    fireEvent.input(input);
    await waitFor(() => expect(scanBtn.disabled).toBe(false));
    fireEvent.click(scanBtn);
    await waitFor(() => {
      // Wait for cancel button to be visible and enabled
      const cancelBtn = root.querySelector('#cancel-btn') as HTMLButtonElement;
      expect(cancelBtn.style.display).toBe('flex');
      expect(cancelBtn.disabled).toBe(false);
    });
    const cancelBtn = root.querySelector('#cancel-btn') as HTMLButtonElement;
    fireEvent.click(cancelBtn);
    // Wait for the 'Stopping scan...' notification to appear
    await waitFor(() => {
      expect(document.body.innerHTML.includes('Stopping scan...')).toBe(true);
    });
    // Wait for the 'Scan stopped successfully' notification to appear
    await waitFor(() => {
      expect(document.body.innerHTML.includes('Scan stopped successfully')).toBe(true);
    });
  });
}); 