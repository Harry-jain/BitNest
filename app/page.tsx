import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 lg:p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex">
        <div className="flex items-center">
          {/* Logo */}
          <div className="h-10 w-10 relative mr-2">
            <Image
              src="/logo.svg"
              alt="BitNest Logo"
              fill
              className="rounded-lg"
              priority
            />
          </div>
          <p className="text-xl font-bold">BitNest</p>
        </div>
        <div className="hidden md:flex">
          <Link 
            href="/auth/login"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>

      <div className="relative flex place-items-center flex-col text-center w-full max-w-5xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Your Personal{' '}
          <span className="text-blue-600 dark:text-blue-400">Media Vault</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl mb-12 text-muted-foreground">
          BitNest provides a lightweight, self-hosted platform for streaming and file storage, 
          designed specifically for mobile devices.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto justify-center">
          <Link
            href="/auth/signup"
            className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="#features"
            className="px-6 py-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>

      <section id="features" className="w-full max-w-5xl my-24">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Adaptive Streaming',
              description: 'Netflix-style HLS streaming with adaptive bitrate for optimal playback',
              icon: '📺'
            },
            {
              title: 'Cloud Storage',
              description: 'Google Drive-like file management with content-defined chunking',
              icon: '☁️'
            },
            {
              title: 'Mobile First',
              description: 'Designed to run on Android devices with Termux, no root required',
              icon: '📱'
            },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="w-full max-w-5xl border-t py-8 mt-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BitNest. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
} 