
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <p className="text-2xl font-light text-gray-600 mb-8">Page Not Found</p>
      <p className="text-gray-500 mb-8">Sorry, the page you are looking for does not exist.</p>
      <Link to="/" className="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors">
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage;
