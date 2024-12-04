import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import SockJS from 'sockjs-client';

interface Message {
  senderUsername: string;
  receiverUsername: string;
  content: string;
  timestamp: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const stompClient = useRef<Client | null>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const username = sessionStorage.getItem('username');

  useEffect(() => {
    if (!username) {
      navigate('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:8080/users');
        const filteredUsers = response.data.filter((user: string) => user !== username);
        setUsers(filteredUsers);
        console.log('Fetched users:', filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    // Fetch users initially
    fetchUsers();

    // Set up polling to fetch users every 10 seconds
    const interval = setInterval(fetchUsers, 10000);

    // Connect to WebSocket with SockJS
    const client = new Client({
      brokerURL: '',  // We're using SockJS so this should be empty
      connectHeaders: {
        login: username || '',
        passcode: 'unused',
      },
      debug: function (str) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      webSocketFactory: () => {
        console.log('Creating new WebSocket connection...');
        return new SockJS('http://localhost:8080/ws');
      },
      onConnect: () => {
        console.log('Connected to WebSocket');
        
        // Add user to WebSocket session
        client.publish({
          destination: '/app/chat.addUser',
          body: JSON.stringify({
            senderUsername: username,
            type: 'JOIN'
          })
        });

        // Subscribe to user-specific messages
        client.subscribe('/user/' + username + '/queue/messages', (message) => {
          console.log('Received message body:', message.body);
          try {
            const receivedMessage = JSON.parse(message.body);
            console.log('Parsed message:', receivedMessage);
            
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const isDuplicate = prev.some(m => 
                m.content === receivedMessage.content && 
                m.timestamp === receivedMessage.timestamp &&
                m.senderUsername === receivedMessage.senderUsername
              );
              if (isDuplicate) {
                return prev;
              }
              return [...prev, receivedMessage];
            });
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });

        // Subscribe to public messages as well
        client.subscribe('/topic/public', (message) => {
          console.log('Received public message:', message.body);
          try {
            const receivedMessage = JSON.parse(message.body);
            console.log('Parsed public message:', receivedMessage);
            setMessages(prev => [...prev, receivedMessage]);
          } catch (error) {
            console.error('Error parsing public message:', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket');
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      },
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
      },
      onWebSocketClose: (event) => {
        console.log('WebSocket closed:', event);
      }
    });

    console.log('Activating STOMP client...');
    client.activate();
    stompClient.current = client;

    return () => {
      clearInterval(interval);
      if (client.active) {
        client.deactivate();
      }
    };
  }, [username, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !username) return;

    try {
      // Ensure WebSocket is connected before sending
      if (!stompClient.current || !stompClient.current.active) {
        console.log('WebSocket not connected. Attempting to reconnect...');
        
        // Reinitialize and activate the client if not active
        if (!stompClient.current) {
          const client = new Client({
            brokerURL: '',  // We're using SockJS so this should be empty
            connectHeaders: {
              login: username,
              passcode: 'unused',
            },
            debug: function (str) {
              console.log('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            webSocketFactory: () => {
              console.log('Creating new WebSocket connection...');
              return new SockJS('http://localhost:8080/ws');
            },
            onConnect: () => {
              console.log('Reconnected to WebSocket');
              client.subscribe('/user/' + username + '/queue/messages', (message) => {
                console.log('Received message body:', message.body);
                try {
                  const receivedMessage = JSON.parse(message.body);
                  console.log('Parsed message:', receivedMessage);
                  setMessages(prev => {
                    // Check if message already exists to prevent duplicates
                    const isDuplicate = prev.some(m => 
                      m.content === receivedMessage.content && 
                      m.timestamp === receivedMessage.timestamp &&
                      m.senderUsername === receivedMessage.senderUsername
                    );
                    if (isDuplicate) {
                      return prev;
                    }
                    return [...prev, receivedMessage];
                  });
                } catch (error) {
                  console.error('Error parsing message:', error);
                }
              });
            },
            onDisconnect: () => {
              console.log('Disconnected from WebSocket');
            },
            onStompError: (frame) => {
              console.error('STOMP error:', frame);
            },
            onWebSocketError: (event) => {
              console.error('WebSocket error:', event);
            },
            onWebSocketClose: (event) => {
              console.log('WebSocket closed:', event);
            }
          });
          client.activate();
          stompClient.current = client;
        } else {
          stompClient.current.activate();
        }

        // Wait a moment for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check connection status again
      if (!stompClient.current?.active) {
        throw new Error('WebSocket connection could not be established');
      }

      const message: Message = {
        senderUsername: username,
        receiverUsername: selectedUser,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log('Sending message:', message);
      
      // Send message to private chat endpoint
      stompClient.current.publish({
        destination: '/app/chat.private',
        body: JSON.stringify(message),
      });

      // Message will be added to UI when received back from server
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please check your connection.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('username');
    if (stompClient.current?.active) {
      stompClient.current.deactivate();
    }
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Users</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto h-full">
          {users.length === 0 ? (
            <div className="p-4 text-gray-500">No other users available</div>
          ) : (
            users.map((user) => (
              <div
                key={user}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedUser === user ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                {user}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white">
          <h2 className="text-xl font-semibold">
            {selectedUser ? `Chat with ${selectedUser}` : 'Select a user to chat'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages
            .filter(
              (msg) =>
                (msg.senderUsername === selectedUser && msg.receiverUsername === username) ||
                (msg.senderUsername === username && msg.receiverUsername === selectedUser)
            )
            .map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.senderUsername === username ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                    message.senderUsername === username
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t bg-white">
          <div className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                selectedUser
                  ? 'Type your message...'
                  : 'Select a user to start chatting'
              }
              disabled={!selectedUser}
              className="input-field flex-1"
            />
            <button
              type="submit"
              disabled={!selectedUser}
              className="btn-primary disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
