from flask import Flask, request, jsonify, make_response, g
from flask_cors import CORS
from functools import wraps
import sqlite3
import random
import string
import bcrypt
import os

app = Flask(__name__)
CORS(app, 
     resources={r"/api/*": {
         "origins": ["http://localhost:3000"],
         "supports_credentials": True,
         "allow_headers": ["Content-Type", "Authorization"], 
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
     }})

# Helper Functions
def handle_options(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 204
        return f(*args, **kwargs)
    return wrapper

# Database operations
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect('db/database.sqlite3')
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = g.pop('_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    return (rows[0] if rows else None) if one else rows

def generate_session_token():
    """Generate a random session token"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=64))

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'message': 'No auth token provided'}), 401
        
        # Extract token from "Bearer <token>"
        try:
            auth_token = auth_header.split(' ')[1] if 'Bearer' in auth_header else auth_header
        except IndexError:
            return jsonify({'message': 'Invalid auth token format'}), 401
        
        user = query_db('SELECT * FROM users WHERE auth_token = ?', [auth_token], one=True)
        if not user:
            return jsonify({'message': 'Invalid auth token'}), 401
                
        return f(user['id'], *args, **kwargs)
    return decorated

# API Routes
#################
# User-related operations
#################

@app.route('/api/auth/signup', methods=['OPTIONS', 'POST'])
@handle_options
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Username and password required'}), 400
    
    try:
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        auth_token = generate_session_token()
        
        query_db(
            'INSERT INTO users (username, password, auth_token) VALUES (?, ?, ?)',
            [username, hashed_password.decode('utf-8'), auth_token]
        )
        
        # Return token in response body instead of cookie
        return jsonify({
            'message': 'Signup successful',
            'auth_token': auth_token
        }), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Username already exists'}), 400

@app.route('/api/auth/login', methods=['OPTIONS', 'POST'])
@handle_options
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Username and password required'}), 400
    
    user = query_db('SELECT * FROM users WHERE username = ?', [username], one=True)
    
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        auth_token = generate_session_token()
        query_db('UPDATE users SET auth_token = ? WHERE id = ?', [auth_token, user['id']])
        
        # Return token in response body instead of cookie
        return jsonify({
            'message': 'Login successful',
            'auth_token': auth_token,
            'username': username
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['OPTIONS', 'POST'])
@handle_options
@auth_required
def logout(user_id):
    query_db('UPDATE users SET auth_token = NULL WHERE id = ?', [user_id])
    resp = jsonify({'message': 'Logout successful'})
    resp.set_cookie('auth_token', '', expires=0)
    return resp, 200

@app.route('/api/auth/update', methods=['OPTIONS', 'PUT'])
@handle_options
@auth_required
def update_profile(user_id):
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username and not password:
        return jsonify({'message': 'No updates provided'}), 400
    
    try:
        updates = []
        values = []
        
        if username:
            updates.append('username = ?')
            values.append(username)
            
        if password:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            updates.append('password = ?')
            values.append(hashed_password.decode('utf-8'))
            
        values.append(user_id)
        
        query = f'''
            UPDATE users 
            SET {', '.join(updates)}
            WHERE id = ?
        '''
        
        query_db(query, values)
        
        return jsonify({
            'message': 'Profile updated successfully',
            'username': username if username else None
        }), 200
        
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Username already exists'}), 400

#################
# Channel management
#################
@app.route('/api/channels', methods=['OPTIONS', 'GET'])
@handle_options
@auth_required
def get_channels(user_id):
    channels = query_db('SELECT * FROM channels')
    return jsonify([dict(channel) for channel in channels])

@app.route('/api/channels', methods=['OPTIONS', 'POST'])
@handle_options
@auth_required
def create_channel(user_id):
    data = request.get_json()
    name = data.get("name")
    
    if not name:
        return jsonify({'message': 'Channel name required'}), 400
    
    try:
        query_db('INSERT INTO channels(name) VALUES (?)', [name])
        channel = query_db('SELECT * FROM channels WHERE name = ?', [name], one=True)
        return jsonify(dict(channel)), 201
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Channel name already exists'}), 400

@app.route('/api/channels/<int:channel_id>', methods=['OPTIONS', 'GET'])
@handle_options
@auth_required
def get_channel(user_id, channel_id):
    channel = query_db('SELECT * FROM channels WHERE id = ?', [channel_id], one=True)
    if channel:
        return jsonify(dict(channel))
    return jsonify({'message': 'Channel not found'}), 404

#################
# Messages
#################
@app.route('/api/channels/<int:channel_id>/messages', methods=['OPTIONS', 'GET'])
@handle_options
@auth_required
def get_messages(user_id, channel_id):
    messages = query_db('''
        SELECT m.*, 
               u.username,
               (SELECT COUNT(*) FROM messages r WHERE r.replies_to = m.id) as reply_count
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ? 
        AND m.replies_to IS NULL
        ORDER BY m.created_at DESC
    ''', [channel_id])
    
    message_list = []
    for message in messages:
        message_dict = dict(message)
        
        # Updated query to properly fetch reaction users
        reactions = query_db('''
            SELECT 
                r.emoji,
                COUNT(DISTINCT r.user_id) as count,
                GROUP_CONCAT(DISTINCT u.username) as users
            FROM reactions r
            JOIN users u ON r.user_id = u.id
            WHERE r.message_id = ?
            GROUP BY r.emoji
        ''', [message['id']])
        
        # Process reactions
        processed_reactions = []
        for reaction in reactions:
            reaction_dict = dict(reaction)
            # Split the concatenated usernames into a list
            if reaction_dict['users']:
                reaction_dict['users'] = reaction_dict['users'].split(',')
                reaction_dict['count'] = len(reaction_dict['users'])  # Ensure count matches users
            else:
                reaction_dict['users'] = []
                reaction_dict['count'] = 0
            processed_reactions.append(reaction_dict)
        
        message_dict['reactions'] = processed_reactions
        message_list.append(message_dict)
    
    return jsonify(message_list)

@app.route('/api/channels/<int:channel_id>/messages', methods=['OPTIONS', 'POST'])
@handle_options
@auth_required
def post_message(user_id, channel_id):
    data = request.get_json()
    content = data.get('content')
    replies_to = data.get('replies_to')
    
    if not content:
        return jsonify({'message': 'Message content required'}), 400
    
    try:
        query_db(
            '''INSERT INTO messages 
               (user_id, channel_id, content, replies_to) 
               VALUES (?, ?, ?, ?)''',
            [user_id, channel_id, content, replies_to]
        )
        
        message = query_db('''
            SELECT m.*, u.username
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = last_insert_rowid()
        ''', one=True)
        
        return jsonify(dict(message)), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Invalid reply reference'}), 400

#################
# Message replies
#################
@app.route('/api/channels/<int:channel_id>/messages/<int:message_id>', methods=['OPTIONS', 'GET'])
@handle_options
@auth_required
def get_message(user_id, channel_id, message_id):
    message = query_db('''
        SELECT m.*, 
               u.username,
               (SELECT COUNT(*) FROM messages r WHERE r.replies_to = m.id) as reply_count
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ? AND m.id = ?
    ''', [channel_id, message_id], one=True)
    
    if message:
        return jsonify(dict(message))
    return jsonify({'message': 'Message not found'}), 404

@app.route('/api/messages/<int:message_id>/replies', methods=['OPTIONS', 'GET'])
@handle_options
@auth_required
def get_replies(user_id, message_id):
    replies = query_db('''
        SELECT m.*, u.username
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.replies_to = ?
        ORDER BY m.created_at ASC
    ''', [message_id])
    
    return jsonify([dict(reply) for reply in replies])

@app.route('/api/messages/<int:message_id>/replies', methods=['OPTIONS', 'POST'])
@handle_options
@auth_required
def post_reply(user_id, message_id):
    data = request.get_json()
    content = data.get('content')
    channel_id = data.get('channel_id')
    
    if not content:
        return jsonify({'message': 'Reply content required'}), 400
    
    try:
        # Get the channel_id from the parent message if not provided
        if not channel_id:
            original_message = query_db(
                'SELECT channel_id FROM messages WHERE id = ?',
                [message_id],
                one=True
            )
            if not original_message:
                return jsonify({'message': 'Original message not found'}), 404
            channel_id = original_message['channel_id']
        
        query_db(
            'INSERT INTO messages(user_id, channel_id, content, replies_to) VALUES (?, ?, ?, ?)',
            [user_id, channel_id, content, message_id]
        )
        
        reply = query_db('''
            SELECT m.*, u.username
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = last_insert_rowid()
        ''', one=True)
        
        return jsonify(dict(reply)), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Invalid reply reference'}), 400

#################
# Message reactions
#################
@app.route('/api/messages/<int:message_id>/reactions', methods=['OPTIONS', 'POST'])
@handle_options
@auth_required
def add_reaction(user_id, message_id):
    data = request.get_json()
    emoji = data.get('emoji')

    if not emoji:
        return jsonify({'message': 'Reaction emoji required'}), 400
    
    try:
        # Check if message exists
        message = query_db('SELECT id FROM messages WHERE id = ?', 
                         [message_id], one=True)
        if not message:
            return jsonify({'message': 'Message not found'}), 404

        # Add the reaction
        query_db('''
            INSERT INTO reactions (user_id, message_id, emoji) 
            VALUES (?, ?, ?)
        ''', [user_id, message_id, emoji])
        
        # Fetch updated reactions with user information
        reactions = query_db('''
            SELECT 
                r.emoji,
                COUNT(*) as count,
                GROUP_CONCAT(u.username) as users,
                GROUP_CONCAT(u.id) as user_ids
            FROM reactions r
            JOIN users u ON r.user_id = u.id
            WHERE r.message_id = ?
            GROUP BY r.emoji
        ''', [message_id])
        
        # Process reactions
        processed_reactions = []
        for reaction in reactions:
            reaction_dict = dict(reaction)
            reaction_dict['users'] = reaction_dict['users'].split(',') if reaction_dict['users'] else []
            reaction_dict['user_ids'] = [int(id) for id in reaction_dict['user_ids'].split(',')] if reaction_dict['user_ids'] else []
            reaction_dict['has_reacted'] = user_id in reaction_dict['user_ids']
            processed_reactions.append(reaction_dict)
        
        return jsonify({
            'message': 'Reaction added',
            'reactions': processed_reactions
        }), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Reaction already exists'}), 400

@app.route('/api/messages/<int:message_id>/reactions', methods=['OPTIONS', 'DELETE'])
@handle_options
@auth_required
def remove_reaction(user_id, message_id):
    data = request.get_json()
    emoji = data.get('emoji')
    
    if not emoji:
        return jsonify({'message': 'Emoji required'}), 400
        
    query_db('''
        DELETE FROM reactions 
        WHERE user_id = ? AND message_id = ? AND emoji = ?
    ''', [user_id, message_id, emoji])
    
    reactions = query_db('''
        SELECT emoji, COUNT(*) as count
        FROM reactions
        WHERE message_id = ?
        GROUP BY emoji
    ''', [message_id])
    
    return jsonify({
        'message': 'Reaction removed',
        'reactions': [dict(r) for r in reactions]
    })

#################
# Read status management
#################
@app.route('/api/channels/unread', methods=['OPTIONS', 'GET'])
@handle_options
@auth_required
def get_unread_counts(user_id):
    try:
        unread_counts = query_db('''
            WITH LastRead AS (
                SELECT channel_id, last_read_message_id
                FROM message_reads
                WHERE user_id = ?
            )
            SELECT 
                c.id as channel_id,
                c.name as channel_name,
                COUNT(CASE 
                    WHEN m.id > COALESCE(lr.last_read_message_id, 0) 
                    THEN 1 
                    END
                ) as unread_count
            FROM channels c
            LEFT JOIN messages m ON c.id = m.channel_id
            LEFT JOIN LastRead lr ON c.id = lr.channel_id
            GROUP BY c.id, c.name
        ''', [user_id])
        
        return jsonify([dict(count) for count in unread_counts])
        
    except Exception as e:
        print(f"Error getting unread counts: {e}")
        return jsonify({'error': 'Failed to get unread counts'}), 500

@app.route('/api/channels/<int:channel_id>/read', methods=['OPTIONS', 'POST'])
@handle_options
@auth_required
def mark_channel_read(user_id, channel_id):
    try:
        # Get the latest message ID in the channel
        latest_message = query_db('''
            SELECT id 
            FROM messages 
            WHERE channel_id = ? 
            ORDER BY id DESC LIMIT 1
        ''', [channel_id], one=True)
        
        if latest_message:
            # Update or insert the read status
            query_db('''
                INSERT OR REPLACE INTO message_reads 
                (user_id, channel_id, last_read_message_id, last_read_at) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', [user_id, channel_id, latest_message['id']])
            
            return jsonify({
                'message': 'Channel marked as read',
                'last_read_message_id': latest_message['id']
            })
        
        return jsonify({'message': 'No messages in channel'})
        
    except Exception as e:
        print(f"Error marking channel as read: {e}")
        return jsonify({'error': 'Failed to mark channel as read'}), 500

# Update channel
@app.route('/api/channels/<int:channel_id>', methods=['OPTIONS', 'PUT'])
@handle_options
@auth_required
def update_channel(user_id, channel_id):
    data = request.get_json()
    new_name = data.get('name')
    
    if not new_name:
        return jsonify({'message': 'Channel name is required'}), 400
        
    # Check if user has permission (optional)
    channel = query_db('SELECT * FROM channels WHERE id = ?', [channel_id], one=True)
    if not channel:
        return jsonify({'message': 'Channel not found'}), 404
        
    # Update channel name
    query_db('''
        UPDATE channels 
        SET name = ? 
        WHERE id = ?
    ''', [new_name, channel_id])
    
    return jsonify({'message': 'Channel updated successfully'}), 200

# Delete channel
@app.route('/api/channels/<int:channel_id>', methods=['OPTIONS', 'DELETE'])
@handle_options
@auth_required
def delete_channel(user_id, channel_id):
    try:
        # Delete all related data first
        query_db('DELETE FROM message_reads WHERE channel_id = ?', [channel_id])
        query_db('DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE channel_id = ?)', [channel_id])
        query_db('DELETE FROM messages WHERE channel_id = ?', [channel_id])
        query_db('DELETE FROM channels WHERE id = ?', [channel_id])
        
        return jsonify({'message': 'Channel deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting channel: {e}")
        return jsonify({'message': 'Failed to delete channel'}), 500

if __name__ == '__main__':
    app.run(debug=True)