import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../../utils/api';
import { toast } from 'react-toastify';
import MessageList from '../messages/MessageList';
import MessageInput from '../messages/MessageInput';
import ReplyThread from '../messages/ReplyThread';

function ChannelView() {
    const navigate = useNavigate();
    const { channelId } = useParams();
    const [channel, setChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const isMobile = window.innerWidth <= 768;

    // Fetch channel details
    useEffect(() => {
        if (!channelId) return;

        const fetchChannel = async () => {
            try {
                const response = await authFetch(`http://127.0.0.1:5000/api/channels/${channelId}`);
                if (response.ok) {
                    const data = await response.json();
                    setChannel(data);
                    document.title = `#${data.name} - Belay`;
                }
            } catch (error) {
                console.error('Error fetching channel:', error);
                setError('Failed to load channel');
            }
        };

        fetchChannel();

        // Listen for channel updates and deletions
        const handleChannelUpdate = (event) => {
            if (event.detail.channelId === parseInt(channelId)) {
                setChannel(prev => ({
                    ...prev,
                    name: event.detail.newName
                }));
                document.title = `#${event.detail.newName} - Belay`;
            }
        };

        const handleChannelDelete = (event) => {
            if (event.detail.channelId === parseInt(channelId)) {
                toast.info('This channel has been deleted');
                navigate('/');
            }
        };

        window.addEventListener('channelDeleted', handleChannelDelete);
        window.addEventListener('channelNameUpdated', handleChannelUpdate);

        return () => {
            window.removeEventListener('channelDeleted', handleChannelDelete);
            window.removeEventListener('channelNameUpdated', handleChannelUpdate);
        };
    }, [channelId, navigate]);

    // Mark channel as read when viewing or receiving new messages
    useEffect(() => {
        if (!channelId) return;

        const markChannelRead = async () => {
            try {
                await authFetch(`http://127.0.0.1:5000/api/channels/${channelId}/read`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Error marking channel as read:', error);
            }
        };

        markChannelRead();
    }, [channelId, messages]);

    // Fetch messages
    useEffect(() => {
        if (!channelId) return;

        const fetchMessages = async () => {
            try {
                const response = await authFetch(`http://127.0.0.1:5000/api/channels/${channelId}/messages`);
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
                setError('Failed to load messages');
            }
        };

        fetchMessages();

        // Set up polling for new messages
        const interval = setInterval(fetchMessages, 1000);

        return () => clearInterval(interval);
    }, [channelId]);

    const handleNewMessage = async (content) => {
        try {
            const response = await authFetch(`http://127.0.0.1:5000/api/channels/${channelId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                const newMessage = await response.json();
                setMessages(prev => [newMessage, ...prev]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        }
    };

    const handleReplyClick = (messageId) => {
        setSelectedMessageId(messageId);
    };

    const handleCloseThread = () => {
        setSelectedMessageId(null);
    };

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="content">
            <div className="channel-messages">
                {isMobile && (
                    <button 
                        className="mobile-nav-button"
                        onClick={() => navigate('/')}
                    >
                        ← Channels
                    </button>
                )}
                <div className="channel-header">
                    <h2>#{channel?.name}</h2>
                </div>
                <MessageList 
                    messages={messages} 
                    channelId={channelId}
                    onReplyClick={handleReplyClick}
                />
                <MessageInput 
                    onSendMessage={handleNewMessage} 
                    channelId={channelId}
                />
            </div>
            
            {selectedMessageId && (
                <div className={`thread-panel ${isMobile ? 'show' : ''}`}>
                    <div className="thread-header">
                        <h3>Thread</h3>
                        <button onClick={handleCloseThread}>Close</button>
                    </div>
                    <ReplyThread
                        channelId={channelId}
                        messageId={selectedMessageId}
                        onClose={handleCloseThread}
                    />
                </div>
            )}
        </div>
    );
}

export default ChannelView;