import { useEffect, useState } from 'react';
import { loadData, isDataLoaded } from './lib/data';
import { ComponentTest } from './pages/ComponentTest';

function App() {
  const [loading, setLoading] = useState(!isDataLoaded());

  useEffect(() => {
    if (!isDataLoaded()) {
      loadData()
        .then(() => setLoading(false))
        .catch((error) => {
          console.error('Failed to load data:', error);
          setLoading(false);
        });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return <ComponentTest />;
}

export default App;
