import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const HomePage = () => <div><h1>Home Page</h1><p>Welcome to the application!</p></div>;
const AboutPage = () => <div><h1>About Page</h1><p>Learn more about us.</p></div>;
const DashboardPage = () => <div><h1>Dashboard</h1><p>Your personal dashboard.</p></div>;
const NotFoundPage = () => <div><h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p></div>;

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}