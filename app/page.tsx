import { auth0 } from '@/lib/auth0-client';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const session = await auth0.getSession();
  
  // If user is logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#121212] gradient-mesh">
      {/* Navbar */}
      <nav className="border-b border-[#3c3c3c] glass backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-text">
            HealthVault 🏥
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="px-6 py-2 rounded-lg btn-gradient font-semibold transition-all hover-lift"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-6xl font-bold gradient-text mb-6 text-shadow-lg">
              HealthVault 🏥
            </h1>
            <p className="text-2xl text-white mb-4">
              Your Personal Health Repository Platform
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Securely store, manage, and share your medical reports with AES-256-GCM encryption.
              Get AI-powered health insights and collaborate with healthcare providers.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center mb-16 animate-slide-up">
            <Link
              href="/auth/login"
              className="inline-block btn-gradient text-[#121212] px-12 py-4 rounded-lg text-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover-glow"
            >
              Get Started Free
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="glass-card p-8 rounded-2xl hover-lift card-interactive">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Military-Grade Encryption
              </h3>
              <p className="text-gray-400">
                AES-256-GCM encryption ensures your medical data is completely secure and private.
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl hover-lift card-interactive">
              <div className="text-4xl mb-4">🗂️</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Health Repositories
              </h3>
              <p className="text-gray-400">
                Organize reports like GitHub repos. Create multiple repositories for different health concerns.
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl hover-lift card-interactive">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Smart Sharing
              </h3>
              <p className="text-gray-400">
                Share specific repositories or all reports with doctors and family members securely.
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl hover-lift card-interactive">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                AI Health Insights
              </h3>
              <p className="text-gray-400">
                Gemini AI analyzes your reports to provide medical analysis and health recommendations.
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl hover-lift card-interactive">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Lightning Fast
              </h3>
              <p className="text-gray-400">
                Optimized performance with lazy loading and caching for instant access.
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl hover-lift card-interactive">
              <div className="text-4xl mb-4">☁️</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Global Storage
              </h3>
              <p className="text-gray-400">
                Cloudflare R2 provides fast, reliable, and scalable storage worldwide.
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="glass-intense rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-white">
              Built with Modern Technologies
            </h2>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300">
              <span className="px-4 py-2 glass rounded-lg shadow">Next.js 16</span>
              <span className="px-4 py-2 glass rounded-lg shadow">Auth0</span>
              <span className="px-4 py-2 glass rounded-lg shadow">MongoDB</span>
              <span className="px-4 py-2 glass rounded-lg shadow">Cloudflare R2</span>
              <span className="px-4 py-2 glass rounded-lg shadow">Gemini AI</span>
              <span className="px-4 py-2 glass rounded-lg shadow">shadcn/ui</span>
              <span className="px-4 py-2 glass rounded-lg shadow">TypeScript</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
