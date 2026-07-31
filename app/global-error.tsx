"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html><body className="bg-slate-50">
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-3xl bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your information is safe. Refresh this screen or return to the application.</p>
          <button onClick={reset} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white">Try again</button>
        </div>
      </main>
    </body></html>
  )
}
