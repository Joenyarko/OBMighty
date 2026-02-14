/**
 * Code splitting and lazy loading strategy for frontend optimization
 * Reduces initial bundle size and improves perceived performance
 */

// Dynamic imports for route-based code splitting
export const DashboardPage = () =>
  import('./pages/CompanyDashboard.jsx').then(module => ({ default: module.default }));

export const SettingsPage = () =>
  import('./pages/CompanySettings.jsx').then(module => ({ default: module.default }));

export const ReportsPage = () =>
  import('./pages/EnhancedReports.jsx').then(module => ({ default: module.default }));

export const AdminDashboardPage = () =>
  import('./pages/AdminDashboard.jsx').then(module => ({ default: module.default }));

export const CompanyManagementPage = () =>
  import('./pages/CompanyManagement.jsx').then(module => ({ default: module.default }));

// Lazy load heavy components
export const ChartComponent = () =>
  import('./components/charts/Chart.jsx').then(module => ({ default: module.default }));

export const TableComponent = () =>
  import('./components/tables/Table.jsx').then(module => ({ default: module.default }));

export const FormComponent = () =>
  import('./components/forms/Form.jsx').then(module => ({ default: module.default }));

/**
 * Preload critical routes on idle time
 */
export function preloadCriticalPages() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload dashboard
      import('./pages/CompanyDashboard.jsx');
      // Preload reports
      import('./pages/EnhancedReports.jsx');
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      import('./pages/CompanyDashboard.jsx');
      import('./pages/EnhancedReports.jsx');
    }, 2000);
  }
}

/**
 * Progressive image loading
 * Uses low-quality placeholder while full image loads
 */
export const ProgressiveImage = ({ src, alt, placeholder }) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [imageRef, setImageRef] = React.useState();

  React.useEffect(() => {
    let img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
    };
  }, [src]);

  return <img ref={setImageRef} src={imageSrc} alt={alt} />;
};

/**
 * Virtual scrolling for large lists
 * Only renders visible items
 */
export const VirtualizedList = ({ items, itemHeight, containerHeight }) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Debounced API calls to reduce requests
 */
export function debounceApiCall(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Request batching for multiple API calls
 */
export async function batchRequests(requests) {
  return Promise.all(requests.map(req => fetch(req).then(r => r.json())));
}

/**
 * Compress response data before storing
 */
export async function compressData(data) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const compressedStream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(compressedStream).arrayBuffer();
}

/**
 * Lazy load heavy libraries on demand
 */
export const lazyLoadLibrary = async (libraryName) => {
  switch (libraryName) {
    case 'pdf-export':
      return import('html2pdf').then(module => module.default);
    case 'charts':
      return import('chart.js').then(module => module.default);
    case 'date-picker':
      return import('date-fns').then(module => module);
    default:
      throw new Error(`Unknown library: ${libraryName}`);
  }
};

/**
 * Web Worker for heavy computations
 */
export class ComputationWorker {
  constructor() {
    this.worker = new Worker('/compute-worker.js');
  }

  compute(data) {
    return new Promise((resolve) => {
      this.worker.onmessage = (e) => resolve(e.data);
      this.worker.postMessage(data);
    });
  }

  terminate() {
    this.worker.terminate();
  }
}

export default {
  preloadCriticalPages,
  debounceApiCall,
  batchRequests,
  compressData,
  lazyLoadLibrary,
  ComputationWorker,
};
