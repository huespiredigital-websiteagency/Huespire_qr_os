export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        {/* Loading Spinner */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-lg font-medium text-slate-600">Loading Restaurant OS...</p>
      </div>
    </div>
  );
}
