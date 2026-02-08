import React from 'react';
import { Container, Row, Col, Card, Button, ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ConsultantDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Mock data for consultant dashboard
  const bookings = [
    { id: 1, client: 'John Doe', service: 'EE Audit', date: '2024-01-22', time: '10:00 AM', status: 'Confirmed' },
    { id: 2, client: 'Jane Smith', service: 'Skills Planning', date: '2024-01-23', time: '2:00 PM', status: 'Pending' },
    { id: 3, client: 'Bob Wilson', service: 'B-BBEE Strategy', date: '2024-01-24', time: '11:00 AM', status: 'Confirmed' },
  ];

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-2">Consultant Dashboard</h1>
              <p className="text-muted mb-0">
                Welcome, {user?.fullName || user?.email}!
              </p>
            </div>
            <Button variant="outline-danger" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-2">📅</div>
              <h5>Upcoming Bookings</h5>
              <div className="h3 text-primary">8</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-2">⭐</div>
              <h5>Average Rating</h5>
              <div className="h3 text-warning">4.8</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-2">💰</div>
              <h5>This Month's Earnings</h5>
              <div className="h3 text-success">R12,500</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upcoming Bookings */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Upcoming Bookings</h5>
                <Button variant="outline-primary" size="sm">
                  View Calendar
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {bookings.map((booking) => (
                  <ListGroup.Item key={booking.id} className="border-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">{booking.client}</h6>
                        <p className="text-muted small mb-0">
                          {booking.service} • {booking.date} at {booking.time}
                        </p>
                      </div>
                      <div>
                        <span className={`badge bg-${getStatusColor(booking.status)} me-2`}>
                          {booking.status}
                        </span>
                        <Button variant="outline-primary" size="sm">
                          Details
                        </Button>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mt-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Quick Actions</h5>
              <div className="d-flex gap-2">
                <Button variant="outline-primary">Update Availability</Button>
                <Button variant="outline-success">View My Profile</Button>
                <Button variant="outline-warning">Manage Services</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'confirmed': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'secondary';
  }
};

export default ConsultantDashboard;