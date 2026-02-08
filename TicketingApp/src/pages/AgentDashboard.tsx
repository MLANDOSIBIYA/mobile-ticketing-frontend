import React, { useState, useEffect } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// Update Ticket interface to be more flexible
interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  clientName: string;
  clientId: string;
  priority: string; // Changed from union to string
  status: string;   // Changed from union to string
  createdAt: string;
  updatedAt: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  module?: string;
  feature?: string;
}

interface BackendTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  module?: string;
  feature?: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  clientName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
}

const AgentDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    myTickets: 0,
    inProgress: 0,
    resolved: 0,
    available: 0
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper function to validate ticket status
  const isValidStatus = (status: string): boolean => {
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'pending'];
    return validStatuses.includes(status.toLowerCase());
  };

  // Helper function to validate ticket priority
  const isValidPriority = (priority: string): boolean => {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    return validPriorities.includes(priority.toLowerCase());
  };

  // Fetch real tickets from backend
  useEffect(() => {
    const fetchTickets = async () => {
      if (!token || !user) {
        setError('Authentication required. Please login again.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        
        const API_URL = 'http://localhost:5266/api';
        
        // Fetch all tickets for the current tenant
        const response = await axios.get(`${API_URL}/tickets`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && Array.isArray(response.data)) {
          const tickets: BackendTicket[] = response.data;
          
          // Transform backend tickets to frontend format with validation
          const transformedTickets: Ticket[] = tickets.map(ticket => {
            // Validate and normalize status
            const status = isValidStatus(ticket.status) 
              ? ticket.status.toLowerCase()
              : 'open'; // Default to 'open' if invalid
              
            // Validate and normalize priority
            const priority = isValidPriority(ticket.priority)
              ? ticket.priority.toLowerCase()
              : 'medium'; // Default to 'medium' if invalid

            return {
              id: ticket.id,
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              description: ticket.description,
              clientName: ticket.clientName,
              clientId: ticket.clientId,
              priority,
              status,
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
              assignedAgentId: ticket.assignedAgentId,
              assignedAgentName: ticket.assignedAgentName,
              module: ticket.module,
              feature: ticket.feature
            };
          });

          // Separate tickets
          const agentAssigned = transformedTickets.filter(t => 
            t.assignedAgentId === user.id && 
            t.status !== 'closed' && 
            t.status !== 'resolved'
          );
          
          const unassigned = transformedTickets.filter(t => 
            (!t.assignedAgentId || t.assignedAgentId === '') && 
            t.status === 'open'
          );

          setAssignedTickets(agentAssigned);
          setAvailableTickets(unassigned);
          
          // Calculate stats
          const inProgressTickets = agentAssigned.filter(t => t.status === 'in_progress').length;
          const resolvedTickets = transformedTickets.filter(t => 
            t.assignedAgentId === user.id && t.status === 'resolved'
          ).length;
          
          setStats({
            myTickets: agentAssigned.length,
            inProgress: inProgressTickets,
            resolved: resolvedTickets,
            available: unassigned.length
          });
          
        } else {
          setError('Invalid response format from server');
        }
        
      } catch (err: any) {
        console.error('Error fetching tickets:', err);
        
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
          logout();
          navigate('/login');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Failed to load tickets. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
    
    // Refresh tickets every 30 seconds
    const intervalId = setInterval(fetchTickets, 30000);
    return () => clearInterval(intervalId);
  }, [token, user, navigate, logout]);

  const handleAssignTicket = async (ticketId: string) => {
    try {
      if (!token) {
        setError('Authentication required');
        return;
      }

      const API_URL = 'http://localhost:5266/api';
      
      // Update ticket assignment on backend
      const response = await axios.put(
        `${API_URL}/tickets/${ticketId}`,
        {
          assignedAgentId: user?.id,
          status: 'in_progress'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        // Find the ticket in available tickets
        const ticketToAssign = availableTickets.find(t => t.id === ticketId);
        if (ticketToAssign) {
          const updatedTicket: Ticket = {
            ...ticketToAssign,
            assignedAgentId: user?.id,
            assignedAgentName: user?.fullName || user?.email || 'You',
            status: 'in_progress',
            updatedAt: new Date().toISOString()
          };
          
          // Update local state
          setAvailableTickets(prev => prev.filter(t => t.id !== ticketId));
          setAssignedTickets(prev => [...prev, updatedTicket]);
          
          // Update stats
          setStats(prev => ({
            ...prev,
            myTickets: prev.myTickets + 1,
            available: prev.available - 1,
            inProgress: prev.inProgress + 1
          }));
          
          alert(`Ticket ${ticketToAssign.ticketNumber} assigned to you successfully!`);
        }
      }
    } catch (err: any) {
      console.error('Error assigning ticket:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        logout();
        navigate('/login');
      } else {
        alert('Failed to assign ticket. Please try again.');
      }
    }
  };

  const handleMarkResolved = async (ticketId: string) => {
    try {
      if (!token) {
        setError('Authentication required');
        return;
      }

      const API_URL = 'http://localhost:5266/api';
      
      // Update ticket status on backend
      const response = await axios.put(
        `${API_URL}/tickets/${ticketId}`,
        {
          status: 'resolved'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        // Update local state
        const updatedTickets = assignedTickets.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, status: 'resolved', updatedAt: new Date().toISOString() }
            : ticket
        );
        
        setAssignedTickets(updatedTickets);
        
        // Update stats
        const ticket = assignedTickets.find(t => t.id === ticketId);
        if (ticket && ticket.status === 'in_progress') {
          setStats(prev => ({
            ...prev,
            inProgress: prev.inProgress - 1,
            resolved: prev.resolved + 1
          }));
        } else {
          setStats(prev => ({
            ...prev,
            resolved: prev.resolved + 1
          }));
        }
        
        alert(`Ticket marked as resolved!`);
      }
    } catch (err: any) {
      console.error('Error resolving ticket:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        logout();
        navigate('/login');
      } else {
        alert('Failed to mark ticket as resolved. Please try again.');
      }
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const displayName = user?.fullName || user?.email || 'Agent';

  if (isLoading && assignedTickets.length === 0 && availableTickets.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading agent dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-800">Agent Dashboard</h1>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                {user?.role || 'Agent'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Logged in as</p>
                <p className="text-sm font-semibold text-gray-800">{displayName}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {error && (
          <Alert variant="warning" className="mb-6">
            <Alert.Heading>Note</Alert.Heading>
            <p>{error}</p>
          </Alert>
        )}

        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back, {displayName}!</h2>
          <p className="text-gray-600">Manage and resolve support tickets.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'My Tickets', value: stats.myTickets, color: 'bg-blue-100 text-blue-800', icon: '📋' },
            { title: 'In Progress', value: stats.inProgress, color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
            { title: 'Resolved', value: stats.resolved, color: 'bg-green-100 text-green-800', icon: '✅' },
            { title: 'Available', value: stats.available, color: 'bg-orange-100 text-orange-800', icon: '📥' }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="text-2xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* My Assigned Tickets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">My Assigned Tickets ({assignedTickets.length})</h3>
          </div>
          <div className="p-4">
            {assignedTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tickets assigned to you yet. Assign tickets from the available tickets below.
              </div>
            ) : (
              <div className="space-y-4">
                {assignedTickets.map((ticket) => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-bold text-gray-900">{ticket.subject}</h4>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full border border-gray-300">
                            #{ticket.ticketNumber}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                        {ticket.module && (
                          <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mt-1">
                            Module: {ticket.module}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                          {formatStatus(ticket.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Client:</span> {ticket.clientName}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          Created: {formatDate(ticket.createdAt)}
                        </span>
                        {ticket.status === 'in_progress' && (
                          <button 
                            onClick={() => handleMarkResolved(ticket.id)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available Tickets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Available Tickets ({availableTickets.length})</h3>
          </div>
          <div className="p-4">
            {availableTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No available tickets at the moment.
              </div>
            ) : (
              <div className="space-y-4">
                {availableTickets.map((ticket) => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-bold text-gray-900">{ticket.subject}</h4>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full border border-gray-300">
                            #{ticket.ticketNumber}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                        {ticket.module && (
                          <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mt-1">
                            Module: {ticket.module}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                          {formatStatus(ticket.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Client:</span> {ticket.clientName}
                      </div>
                      <button 
                        onClick={() => handleAssignTicket(ticket.id)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                      >
                        Assign to Me
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Help Button */}
      <button 
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        aria-label="Help"
        onClick={() => alert('Need help? Contact support@speccon.com')}
        title="Get Help"
      >
        ?
      </button>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default AgentDashboard;