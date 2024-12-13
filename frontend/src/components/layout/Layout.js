import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import ChannelList from '../channels/ChannelList';

function Layout({ children, setIsAuthenticated }) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showThread, setShowThread] = useState(false);
  const location = useLocation();
  const isMobile = window.innerWidth <= 768;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle route changes
  useEffect(() => {
    if (isMobile) {
      const isThreadRoute = location.pathname.includes('/thread/');
      const isChannelRoute = location.pathname.includes('/channels/');
      setShowThread(isThreadRoute);
      setShowSidebar(!isThreadRoute && !isChannelRoute);
    }
  }, [location, isMobile]);

  return (
    <div className="app-container">
      <Header setIsAuthenticated={setIsAuthenticated}>
        {isMobile && (
          <button 
            className="mobile-nav-button"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? '✕' : '☰'}
          </button>
        )}
      </Header>
      <div className="main-content">
        <div className={`sidebar ${showSidebar ? 'show' : ''}`}>
          <ChannelList />
        </div>
        <main className="channel-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;