import { HeaderNav, Footer } from './LandingPage';

export function FAQPage() {
  const faqs = [
    {
      q: 'Are my archive files uploaded to any server?',
      a: 'Never. ZIPDoco is a 100% client-side Progressive Web App. All decompression, inspection, scanning, and repacking operations take place entirely inside your browser using WebAssembly and Web Workers.'
    },
    {
      q: 'Which archive formats are supported?',
      a: 'ZIPDoco natively supports RAR4, RAR5, 7z, TAR, GZ, BZ2, XZ, and standard ZIP archives powered by libarchive WebAssembly.'
    },
    {
      q: 'How does Zip Bomb defense work?',
      a: 'Before full decompression, ZIPDoco inspects header and directory structures to compute expansion ratios (uncompressed size / compressed size). Ratios exceeding 100:1 trigger a safety warning.'
    },
    {
      q: 'Can ZIPDoco handle multi-gigabyte archives?',
      a: 'Yes! ZIPDoco streams files in 4MB chunks through the Origin Private File System (OPFS) without storing the entire archive in JS heap memory.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone dark:bg-ink text-graphite dark:text-stone font-sans transition-colors">
      <HeaderNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h1>
          <p className="text-gray-600 dark:text-gray-400">Everything you need to know about ZIPDoco privacy, architecture, and safety features.</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white dark:bg-graphite p-6 rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm space-y-2">
              <h2 className="text-lg font-bold text-graphite dark:text-stone">{faq.q}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function BlogPage() {
  const posts = [
    {
      title: 'Defending Against Zip Bombs and Directory Traversal in Client-Side JS',
      date: 'February 18, 2025',
      snippet: 'How pre-flight header ratio analysis and OPFS streaming prevent malicious archive payloads from locking browsers or corrupting file systems.'
    },
    {
      title: 'Building a Zero-Network PWA with WebAssembly and OPFS',
      date: 'January 25, 2025',
      snippet: 'An in-depth look at compiling libarchive to Wasm and managing chunked streaming for multi-gigabyte file manipulation.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone dark:bg-ink text-graphite dark:text-stone font-sans transition-colors">
      <HeaderNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Blog &amp; Technical Guides</h1>
          <p className="text-gray-600 dark:text-gray-400">Insights into browser security, WebAssembly streaming, and archive intake.</p>
        </div>

        <div className="space-y-6">
          {posts.map((post, idx) => (
            <article key={idx} className="bg-white dark:bg-graphite p-6 rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm space-y-2">
              <div className="text-xs font-mono text-signal-dim dark:text-signal">{post.date}</div>
              <h2 className="text-xl font-bold text-graphite dark:text-stone">{post.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{post.snippet}</p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone dark:bg-ink text-graphite dark:text-stone font-sans transition-colors">
      <HeaderNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <div className="bg-white dark:bg-graphite p-6 rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            ZIPDoco is designed from the ground up as a zero-telemetry, zero-network application.
          </p>
          <h2 className="text-lg font-bold text-graphite dark:text-stone">1. Data Processing</h2>
          <p>
            All archive reading, decompression, security scanning, and repacking occur exclusively within your browser’s local sandbox memory and Origin Private File System (OPFS). No files or metadata ever leave your device.
          </p>
          <h2 className="text-lg font-bold text-graphite dark:text-stone">2. Analytics &amp; Cookies</h2>
          <p>
            ZIPDoco uses no cookies, no tracking pixels, and no third-party analytics services.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone dark:bg-ink text-graphite dark:text-stone font-sans transition-colors">
      <HeaderNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Terms of Use</h1>
        <div className="bg-white dark:bg-graphite p-6 rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            ZIPDoco is provided "as is", without warranty of any kind, express or implied.
          </p>
          <h2 className="text-lg font-bold text-graphite dark:text-stone">1. License</h2>
          <p>
            ZIPDoco is open-source software provided under the MIT license.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
