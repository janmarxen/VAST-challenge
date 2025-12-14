import React, { useState } from 'react';
import './App.css';
import HomePage from './components/HomePage';
import BusinessDashboard from './components/BusinessViews/BusinessDashboard';
import ResidentDashboard from './components/ResidentViews/ResidentDashboard';
import EmployerDashboard from './components/EmployerViews/EmployerDashboard';

function App() {
  const [activeView, setActiveView] = useState('home');

  return (
    <div className="App">
      <header className="App-header">
        <h1>VAST Challenge 3: Economics Dashboard</h1>
        <nav className="navigation">
          <button
            className={activeView === 'home' ? 'active' : ''}
            onClick={() => setActiveView('home')}
          >
            Home
          </button>
          <button
            className={activeView === 'business' ? 'active' : ''}
            onClick={() => setActiveView('business')}
          >
            Business Prosperity
          </button>
          <button
            className={activeView === 'resident' ? 'active' : ''}
            onClick={() => setActiveView('resident')}
          >
            Resident Financial Health
          </button>
          <button
            className={activeView === 'employer' ? 'active' : ''}
            onClick={() => setActiveView('employer')}
          >
            Employer Health & Turnover
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeView === 'home' && <HomePage onNavigate={setActiveView} />}
        {activeView === 'business' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setActiveView('home')}
                className="ml-6 mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition-colors"
              >
                ← Back to Home
              </button>
            </div>
            <BusinessDashboard />
          </div>
        )}
        {activeView === 'resident' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setActiveView('home')}
                className="ml-6 mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition-colors"
              >
                ← Back to Home
              </button>
            </div>
            <ResidentDashboard />
          </div>
        )}
        {activeView === 'employer' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setActiveView('home')}
                className="ml-6 mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition-colors"
              >
                ← Back to Home
              </button>
            </div>
            <EmployerDashboard />
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Data Visualization Project | EUMaster4HPC</p>
      </footer>
    </div>
  );
}

export default App;
