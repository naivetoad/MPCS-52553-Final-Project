import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../utils/api';
import { toast } from 'react-toastify';
import '../../styles/layout.css';

function Header({ setIsAuthenticated }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const username = localStorage.getItem('weiwuyan_belay_username');

  const handleLogout = async () => {
    try {
      const response = await authFetch('http://127.0.0.1:5000/api/auth/logout', {
        method: 'POST'
      });

      if (response.ok) {
        localStorage.removeItem('weiwuyan_belay_auth_token');
        localStorage.removeItem('weiwuyan_belay_username');
        setIsAuthenticated(false);
        toast.success('Logged out successfully! 👋', {
          position: "top-right",
          autoClose: 3000,
        });
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await authFetch('http://127.0.0.1:5000/api/auth/update', {
        method: 'PUT',
        body: JSON.stringify({
          username: newUsername,
          password: newPassword || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('weiwuyan_belay_username', newUsername);
        setIsEditing(false);
        setShowProfileMenu(false);
        toast.success('Profile updated successfully! 🎉', {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  return (
    <header className="header">
      <h1 className="header-title">Belay</h1>
      <div className="profile-section">
        <div className="user-dropdown">
          <button 
            className="username-button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {username} <span className="dropdown-arrow">▼</span>
          </button>

          {showProfileMenu && (
            <div className="dropdown-menu">
              {!isEditing ? (
                <>
                  <button onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                  <button onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <form onSubmit={handleUpdateProfile} className="profile-form">
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="New Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="password"
                      placeholder="New Password (optional)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  {success && <div className="success-message">{success}</div>}
                  <div className="form-buttons">
                    <button type="submit">Save</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditing(false);
                        setNewUsername('');
                        setNewPassword('');
                        setError('');
                        setSuccess('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;