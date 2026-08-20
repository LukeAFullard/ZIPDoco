import { Archive, ShieldCheck, Zap, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export function HeaderNav() {
  return (
    <header className="border-b border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-graphite dark:text-stone font-bold text-lg tracking-tight hover:opacity-90 transition-opacity">
          <Archive size={22} className="text-signal-dim dark:text-signal" />
          <span>ZIPDoco</span>
        </a>
        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
          <a href="/faq/" className="text-gray-600 dark:text-gray-300 hover:text-graphite dark:hover:text-white transition-colors">FAQ</a>
          <a href="/blog/" className="text-gray-600 dark:text-gray-300 hover:text-graphite dark:hover:text-white transition-colors">Blog</a>
          <a
            href="/app/"
            className="bg-signal text-ink hover:bg-signal/90 font-bold px-4 py-2 rounded-panel transition-all duration-150 shadow-sm flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <span>Launch App</span>
            <ArrowRight size={16} />
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite text-xs text-gray-600 dark:text-gray-400 py-10 mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="font-bold text-graphite dark:text-stone">Product</div>
            <ul className="space-y-1.5">
              <li><a href="/app/" className="hover:text-graphite dark:hover:text-stone">Launch App</a></li>
              <li><a href="/#features" className="hover:text-graphite dark:hover:text-stone">Features</a></li>
              <li><a href="/#comparison" className="hover:text-graphite dark:hover:text-stone">Comparison</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-graphite dark:text-stone">Resources</div>
            <ul className="space-y-1.5">
              <li><a href="/faq/" className="hover:text-graphite dark:hover:text-stone">FAQ</a></li>
              <li><a href="/blog/" className="hover:text-graphite dark:hover:text-stone">Blog &amp; Guides</a></li>
              <li><a href="/llms.txt" className="hover:text-graphite dark:hover:text-stone">llms.txt</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-graphite dark:text-stone">Legal</div>
            <ul className="space-y-1.5">
              <li><a href="/privacy/" className="hover:text-graphite dark:hover:text-stone">Privacy Policy</a></li>
              <li><a href="/terms/" className="hover:text-graphite dark:hover:text-stone">Terms of Use</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-graphite dark:text-stone">Open Source</div>
            <ul className="space-y-1.5">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-graphite dark:hover:text-stone">Source Code</a></li>
              <li><a href="/sitemap.xml" className="hover:text-graphite dark:hover:text-stone">Sitemap</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-graphite/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div>&copy; {new Date().getFullYear()} ZIPDoco. 100% Client-Side Progressive Web App.</div>
          <div className="flex items-center gap-2 text-verdigris">
            <ShieldCheck size={14} />
            <span>Zero Network Dependency • Local Browser WebAssembly</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone dark:bg-ink text-graphite dark:text-stone font-sans transition-colors">
      <HeaderNav />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 space-y-16 py-12">
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-4 pb-8 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/15 border border-signal/40 text-graphite dark:text-stone text-xs font-mono font-medium">
            <ShieldCheck size={14} className="text-signal-dim dark:text-signal" />
            <span>SAFE INTAKE FOR UNTRUSTED ARCHIVES</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-graphite dark:text-stone">
            Open, inspect, and sanitize untrusted archives with total confidence
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-normal">
            Safely extract, preview, and convert RAR, 7z, TAR, and ZIP files directly inside your browser. No server processing, zero network exposure, zero security risks.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/app/"
              className="w-full sm:w-auto bg-signal text-ink hover:bg-signal/90 text-base font-bold px-7 py-3.5 rounded-panel transition-all duration-150 shadow-md flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              <span>Start using it — free</span>
              <ArrowRight size={18} />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto bg-stone border border-graphite/20 dark:bg-graphite dark:border-white/20 dark:text-stone text-graphite hover:bg-gray-100 dark:hover:bg-gray-800 text-base font-semibold px-6 py-3.5 rounded-panel transition-colors flex items-center justify-center gap-2"
            >
              <span>See how it works &darr;</span>
            </a>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="space-y-6 scroll-mt-20">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Built for Safety &amp; Speed</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Inspected and isolated before a single byte touches your disk.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-graphite p-6 rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm space-y-3">
              <div className="p-2.5 rounded-panel bg-signal/15 w-fit text-signal-dim dark:text-signal">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-lg font-bold">Zip Bomb &amp; Slip Defense</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Pre-flight ratio calculations flag expansion bombs before extraction, while automatic path sanitization blocks directory traversal attacks.
              </p>
            </div>

            <div className="bg-white dark:bg-graphite p-6 rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm space-y-3">
              <div className="p-2.5 rounded-panel bg-signal/15 w-fit text-signal-dim dark:text-signal">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-bold">Pre-Flight Secret Scan</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Automatically detects exposed `.env` files, SSH keys, AWS credentials, and high-entropy secret tokens before you share or repack.
              </p>
            </div>

            <div className="bg-white dark:bg-graphite p-6 rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm space-y-3">
              <div className="p-2.5 rounded-panel bg-signal/15 w-fit text-signal-dim dark:text-signal">
                <Zap size={22} />
              </div>
              <h3 className="text-lg font-bold">Zero-Extract Quick Look</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Preview code, markdown, images, comic books, and PDF documents directly inside browser WebAssembly memory without unpacking the full archive.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section id="comparison" className="space-y-6 scroll-mt-20">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How ZIPDoco Compares</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Why security teams and developers choose browser-native intake.</p>
          </div>

          <div className="bg-white dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/20 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-graphite/20 dark:border-white/20 bg-gray-50 dark:bg-ink/50 text-xs font-mono">
                  <th className="p-4">Feature</th>
                  <th className="p-4 text-signal-dim dark:text-signal font-bold">ZIPDoco</th>
                  <th className="p-4 text-gray-500">Cloud Unzip Web Sites</th>
                  <th className="p-4 text-gray-500">Native OS Extractor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite/10 dark:divide-white/10 text-xs sm:text-sm">
                <tr>
                  <td className="p-4 font-semibold">Data Privacy</td>
                  <td className="p-4 font-medium text-verdigris flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> 100% Local (OPFS)
                  </td>
                  <td className="p-4 text-rust">Uploaded to Server</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">Local Disk</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Pre-Flight Security Scan</td>
                  <td className="p-4 font-medium text-verdigris flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Bombs, Leaks, RTLO
                  </td>
                  <td className="p-4 text-gray-400">None</td>
                  <td className="p-4 text-gray-400">None</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Format Support</td>
                  <td className="p-4 font-medium text-verdigris flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> RAR4/5, 7z, TAR, ZIP
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">ZIP / TAR only</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">Varies by OS</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Offline Support</td>
                  <td className="p-4 font-medium text-verdigris flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Full PWA Offline
                  </td>
                  <td className="p-4 text-rust">Requires Internet</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">Offline</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* About / Story Section */}
        <section className="bg-white dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/20 p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-graphite dark:text-stone">Why ZIPDoco Exists</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Opening archives sent over email or downloaded from unknown sources is a constant hazard for developers and security analysts. Existing cloud unzipping services require uploading sensitive files to third-party servers, while traditional native utilities unarchive files directly onto your hard drive without inspecting for Zip Bombs, Zip Slips, or credential leaks.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            ZIPDoco was built to bridge this gap: leveraging WebAssembly and the Origin Private File System (OPFS) to provide a completely sandboxed, client-side workstation that processes gigabyte-scale archives without a single network call.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
