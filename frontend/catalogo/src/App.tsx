import { useState } from 'react';
import { BrandsIntro } from './components/BrandsIntro';
import { CatalogViewport } from './components/CatalogViewport';

type View = 'brands' | 'catalog';

function App() {
  const [view, setView] = useState<View>('brands');
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  return (
    <main className="min-h-screen">
      <div key={view} className="animate-in fade-in duration-700">
        {view === 'brands' ? (
          <BrandsIntro
            onSelectBrand={(brandName) => {
              setSelectedBrand(brandName);
              setView('catalog');
              window.scrollTo({ top: 0 });
            }}
          />
        ) : (
          <CatalogViewport
            brandName={selectedBrand}
            onBack={() => {
              setView('brands');
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </div>
    </main>
  );
}

export default App;
