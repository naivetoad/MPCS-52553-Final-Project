import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authFetch } from '../../utils/api';
import NewChannel from './NewChannel';
import '../../styles/channels.css';
import { toast } from 'react-toastify';

function ChannelList() {
  const [channels, setChannels] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [error, setError] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const currentChannelId = location.pathname.split('/').pop();

  const fetchChannels = async () => {
    try {
      const response = await authFetch('http://127.0.0.1:5000/api/channels');
      if (response.ok) {
        const data = await response.json();
        setChannels(data);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast.error('Failed to load channels');
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const response = await authFetch('http://127.0.0.1:5000/api/channels/unread');
        if (response.ok) {
          const data = await response.json();
          setUnreadCounts(data.reduce((acc, curr) => {
            acc[curr.channel_id] = curr.unread_count;
            return acc;
          }, {}));
        }
      } catch (error) {
        console.error('Error fetching unread counts:', error);
      }
    };

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 500);
    return () => clearInterval(interval);
  }, []);

  const handleNewChannel = (newChannel) => {
    setChannels(prev => [...prev, newChannel]);
  };

  const handleEditClick = (channel) => {
    setEditingChannel(channel);
    setNewName(channel.name);
  };

  const handleUpdateChannel = async (channelId) => {
    try {
      const response = await authFetch(`http://127.0.0.1:5000/api/channels/${channelId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        toast.success('Channel updated successfully');
        setEditingChannel(null);
        fetchChannels();
        window.dispatchEvent(new CustomEvent('channelNameUpdated', {
          detail: { channelId, newName }
        }));
      }
    } catch (error) {
      toast.error('Failed to update channel');
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;

    try {
      const response = await authFetch(`http://127.0.0.1:5000/api/channels/${channelId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Channel deleted successfully');
        navigate('/');
        fetchChannels();
        window.dispatchEvent(new CustomEvent('channelDeleted', {
          detail: { channelId }
        }));
      }
    } catch (error) {
      toast.error('Failed to delete channel');
    }
  };

  return (
    <div className="channel-list">
      <div className="channels-header">
        <h2>Channels</h2>
        <NewChannel onChannelCreated={handleNewChannel} />
      </div>

      {error && <div className="error-message">{error}</div>}

      <ul>
        {channels.map(channel => (
          <li key={channel.id} className={channel.id === Number(currentChannelId) ? 'active' : ''}>
            {editingChannel?.id === channel.id ? (
              <div className="channel-edit-form">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateChannel(channel.id)}
                />
                <button onClick={() => handleUpdateChannel(channel.id)}>✓</button>
                <button onClick={() => setEditingChannel(null)}>✕</button>
              </div>
            ) : (
              <Link to={`/channels/${channel.id}`} className="channel-link">
                <span className="channel-name">
                  #{channel.name}
                  {unreadCounts[channel.id] > 0 && (
                    <span className="unread-badge">{unreadCounts[channel.id]}</span>
                  )}
                </span>
                <div className="channel-actions">
                  <button 
                    className="channel-action-btn edit"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditClick(channel);
                    }}
                    title="Edit channel"
                  >
                    ✎
                  </button>
                  <button 
                    className="channel-action-btn delete"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteChannel(channel.id);
                    }}
                    title="Delete channel"
                  >
                    🗑️
                  </button>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChannelList;