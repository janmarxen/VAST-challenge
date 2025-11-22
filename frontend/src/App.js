import React, { useState } from 'react';
import './App.css';
import BusinessDashboard from './components/BusinessViews/BusinessDashboard';
import ResidentDashboard from './components/ResidentViews/ResidentDashboard';
import EmployerDashboard from './components/EmployerViews/EmployerDashboard';

function App() {
  const [activeView, setActiveView] = useState('business');

  return (
    <div className="App">
      <header className="App-header">
        <h1>VAST Challenge 3: Economics Dashboard</h1>
        <nav className="navigation">
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
        {activeView === 'business' && <BusinessDashboard />}
        {activeView === 'resident' && <ResidentDashboard />}
        {activeView === 'employer' && <EmployerDashboard />}
      </main>

      <footer className="App-footer">
        <p>Data Visualization Project | EUMaster4HPC</p>
      </footer>
    </div>
  );
}

export default App;
