export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <h1 className="text-4xl font-bold tracking-tighter mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        We couldn't find the page you were looking for. It might have been removed, renamed, 
        or didn't exist in the first place.
      </p>
      <a href="/" className="bg-primary text-primary-foreground shadow hover:bg-primary/90 rounded-md px-4 py-2">
        Go back home
      </a>
    </div>
  );
} 