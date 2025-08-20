import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const HomePage = () => (
  <div>
    <h1>Welcome to the Application!</h1>
    <p>This is the home page.</p>
  </div>
);

const DashboardPage = () => (
  <div>
    <h1>Dashboard</h1>
    <p>View your application's metrics and data here.</p>
  </div>
);

const SettingsPage = () => (
  <div>
    <h1>Settings</h1>
    <p>Configure your application preferences.</p>
  </div>
);

const NotFoundPage = () => (
  <div>
    <h1>404 - Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
  </div>
);

function App() {
  return (
    <Router>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
        </ul>
      </nav>
      <hr />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;