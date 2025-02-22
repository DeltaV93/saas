import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to Our App
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Explore the features and get started today!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-center"
          >
            Get Started
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto bg-white text-indigo-600 border border-indigo-600 py-3 px-6 rounded-lg hover:bg-indigo-50 transition-colors duration-200 text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
