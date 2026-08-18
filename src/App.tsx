import { Archive } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-graphite/20 dark:border-white/15 bg-stone dark:bg-graphite">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-graphite dark:text-stone">
            <Archive size={24} className="text-signal-dim dark:text-signal" />
            <h1 className="text-xl font-bold">ZIPDoco</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 shadow-sm p-6 text-center">
          <h2 className="text-lg font-semibold mb-2 text-graphite dark:text-stone">Safe Intake</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Drag and drop an archive here, or click to select one.
          </p>
          <button className="bg-graphite hover:bg-ink dark:bg-stone dark:hover:bg-gray-300 text-stone dark:text-ink inline-flex items-center justify-center font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2">
            Select Archive
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
