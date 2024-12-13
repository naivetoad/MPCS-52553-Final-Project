import React, { useState } from 'react';
import { authFetch } from '../../utils/api';
import '../../styles/channels.css';

function NewChannel({ onChannelCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    try {
      const response = await authFetch('http://127.0.0.1:5000/api/channels', {
        method: 'POST',
        body: JSON.stringify({ name: channelName })
      });

      if (response.ok) {
        const newChannel = await response.json();
        onChannelCreated(newChannel);
        setChannelName('');
        setIsOpen(false);
        setError('');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create channel');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      setError('Failed to create channel');
    }
  };

  return (
    <div className="new-channel">
      {!isOpen ? (
        <button 
          className="new-channel-button"
          onClick={() => setIsOpen(true)}
        >
          + Add Channel
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="new-channel-form">
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Enter channel name"
            autoFocus
          />
          {error && <div className="error-message">{error}</div>}
          <div className="form-buttons">
            <button type="submit">Create</button>
            <button 
              type="button" 
              onClick={() => {
                setIsOpen(false);
                setChannelName('');
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default NewChannel;