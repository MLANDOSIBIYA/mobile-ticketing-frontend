import React, { useState, ChangeEvent, FormEvent } from 'react';
import { 
  Container, Row, Col, Card, Form, Button, Alert, 
  Badge, Accordion 
} from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import ScreenRecorder from '../components/ScreenRecorder';

const CreateTicket: React.FC = () => {
  const { token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    module: '',
    category: ''
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'form' | 'recorder'>('form');
  const [recordedVideos, setRecordedVideos] = useState<File[]>([]);

  const categories = [
    {
      id: 1,
      title: 'Bug Report',
      description: 'Report a system error or unexpected behavior',
      icon: '🐛',
      value: 'bug'
    },
    {
      id: 2,
      title: 'Feature Request',
      description: 'Suggest a new feature or improvement',
      icon: '💡',
      value: 'feature'
    },
    {
      id: 3,
      title: 'How-to Question',
      description: 'Ask how to accomplish something in the system',
      icon: '❓',
      value: 'question'
    }
  ];

  const modules = [
    { value: '', label: 'Select module where issue occurs...' },
    { value: 'course-library', label: 'Course Library' },
    { value: 'employment-equity', label: 'Employment Equity' },
    { value: 'teams', label: 'Teams & Users' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'account', label: 'Account Settings' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'mobile-app', label: 'Mobile App' },
    { value: 'api', label: 'API Integration' },
    { value: 'other', label: 'Other' }
  ];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category }));
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      // Validate file sizes (100MB max for videos)
      const validFiles = filesArray.filter(file => {
        if (file.size > 100 * 1024 * 1024) {
          setError(`File ${file.name} is too large (max 100MB)`);
          return false;
        }
        return true;
      });
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRecordingComplete = (recordingBlob: Blob, fileName: string) => {
    // Convert blob to file
    const videoFile = new File([recordingBlob], fileName, {
      type: 'video/webm',
      lastModified: Date.now()
    });
    
    setRecordedVideos(prev => [...prev, videoFile]);
    setSelectedFiles(prev => [...prev, videoFile]);
    
    // Show success message
    setSuccess(`🎥 Screen recording "${fileName}" has been saved and will be attached to your ticket.`);
    
    // Switch back to form tab
    setTimeout(() => {
      setActiveTab('form');
    }, 2000);
  };

  const removeFile = (fileIndex: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
    setRecordedVideos(prev => prev.filter((_, i) => i !== fileIndex));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    setUploadProgress(0);

    // Validation
    if (!formData.subject.trim()) {
      setError('Please enter a subject for your ticket');
      setIsSubmitting(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Please describe the issue or request');
      setIsSubmitting(false);
      return;
    }

    if (!selectedCategory) {
      setError('Please select a category for your ticket');
      setIsSubmitting(false);
      return;
    }

    if (!formData.module) {
      setError('Please select the module where the issue occurs');
      setIsSubmitting(false);
      return;
    }

    if (!isAuthenticated || !token) {
      setError('You must be logged in to create a ticket');
      setIsSubmitting(false);
      navigate('/login');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('Subject', formData.subject);
      formDataToSend.append('Description', formData.description);
      formDataToSend.append('Priority', formData.priority);
      formDataToSend.append('Module', formData.module);
      formDataToSend.append('Category', selectedCategory);
      
      // Add all files
      selectedFiles.forEach((file) => {
        formDataToSend.append(`Files`, file);
      });

      const response = await axios.post('http://localhost:5266/api/tickets', formDataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });

      if (response.data) {
        setSuccess(`✅ Ticket #${response.data.ticketNumber} created successfully! Redirecting to dashboard...`);
        
        setTimeout(() => {
          navigate('/client/home');
        }, 3000);
      }
      
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        logout();
        navigate('/login');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to create ticket. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-5">
      <div className="mb-4">
        <Link 
          to="/client/home" 
          className="text-decoration-none d-flex align-items-center text-primary"
        >
          <div className="bg-white border rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
            ←
          </div>
          <span className="fw-bold">Back to Dashboard</span>
        </Link>
      </div>

      <Row className="justify-content-center">
        <Col lg={10} xl={8}>
          <Card className="border-0 shadow-lg">
            <div 
              className="w-100" 
              style={{ 
                height: '4px',
                background: 'linear-gradient(90deg, #0066cc 0%, #ff8c00 50%, #00cc88 100%)'
              }}
            />
            
            <Card.Body className="p-4 p-md-5">
              <div className="mb-5 text-center">
                <h1 className="display-6 fw-bold text-primary mb-2">
                  Create Support Ticket
                </h1>
                <p className="text-muted fs-5">
                  Get help from our technical team. Screen recordings help us understand your issue better.
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="d-flex flex-wrap gap-3 justify-content-center mb-5">
                <Button
                  variant={activeTab === 'form' ? 'primary' : 'outline-primary'}
                  size="lg"
                  onClick={() => setActiveTab('form')}
                  className="px-4"
                >
                  <i className="fas fa-edit me-2"></i>
                  Write Ticket
                </Button>
                <Button
                  variant={activeTab === 'recorder' ? 'warning' : 'outline-warning'}
                  size="lg"
                  onClick={() => setActiveTab('recorder')}
                  className="px-4"
                >
                  <i className="fas fa-video me-2"></i>
                  Record Screen
                </Button>
              </div>

              {/* Main Content Area */}
              {activeTab === 'form' ? (
                <>
                  {/* Standard Ticket Form */}
                  {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
                  {success && <Alert variant="success" className="mb-4">{success}</Alert>}

                  <Form onSubmit={handleSubmit}>
                    {/* Category Selection */}
                    <Form.Group className="mb-5">
                      <Form.Label className="fw-bold text-uppercase small text-muted mb-3">
                        What type of ticket is this?
                      </Form.Label>
                      <Row className="g-3">
                        {categories.map((category) => (
                          <Col md={4} key={category.id}>
                            <Card
                              className={`h-100 cursor-pointer border-2 transition-all ${
                                selectedCategory === category.value 
                                  ? 'border-primary bg-primary bg-opacity-5' 
                                  : 'border-light-subtle'
                              }`}
                              onClick={() => handleCategorySelect(category.value)}
                              style={{ cursor: 'pointer' }}
                            >
                              <Card.Body className="p-4 text-center">
                                <div 
                                  className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                  style={{ 
                                    width: '60px', 
                                    height: '60px',
                                    backgroundColor: selectedCategory === category.value 
                                      ? 'rgba(0, 102, 204, 0.1)' 
                                      : '#f8f9fa',
                                    fontSize: '1.8rem'
                                  }}
                                >
                                  {category.icon}
                                </div>
                                <Card.Title className="fw-bold mb-2">
                                  {category.title}
                                </Card.Title>
                                <Card.Text className="text-muted small">
                                  {category.description}
                                </Card.Text>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Form.Group>

                    {/* Priority Selection */}
                    <Form.Group className="mb-5">
                      <Form.Label className="fw-bold text-uppercase small text-muted mb-3">
                        How urgent is this issue?
                      </Form.Label>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          { value: 'low', label: 'Low', color: 'secondary', icon: '🐢' },
                          { value: 'medium', label: 'Medium', color: 'primary', icon: '⚡' },
                          { value: 'high', label: 'High', color: 'warning', icon: '🚨' },
                          { value: 'critical', label: 'Critical', color: 'danger', icon: '🔥' }
                        ].map((priority) => (
                          <Button
                            key={priority.value}
                            type="button"
                            variant={formData.priority === priority.value ? priority.color : `outline-${priority.color}`}
                            className="rounded-pill px-4 py-2"
                            onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                          >
                            <span className="me-2">{priority.icon}</span>
                            {priority.label}
                          </Button>
                        ))}
                      </div>
                    </Form.Group>

                    {/* Module Selection */}
                    <Form.Group className="mb-5">
                      <Form.Label className="fw-bold text-uppercase small text-muted mb-2">
                        Where does this issue occur?
                      </Form.Label>
                      <Form.Select
                        name="module"
                        value={formData.module}
                        onChange={handleChange}
                        className="py-3 border-2"
                        required
                      >
                        {modules.map((module) => (
                          <option key={module.value} value={module.value}>
                            {module.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Subject */}
                    <Form.Group className="mb-5">
                      <Form.Label className="fw-bold text-uppercase small text-muted mb-2">
                        Brief description of the issue
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="e.g., 'Cannot generate EE report' or 'Login page shows error'"
                        className="py-3 border-2"
                        required
                      />
                      <Form.Text className="text-muted">
                        Keep it short and descriptive (max 100 characters)
                      </Form.Text>
                    </Form.Group>

                    {/* Description */}
                    <Form.Group className="mb-5">
                      <Form.Label className="fw-bold text-uppercase small text-muted mb-2">
                        Detailed description
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder={`Please include:
• Steps to reproduce the issue
• What you expected to happen
• What actually happened
• Any error messages you saw`}
                        rows={6}
                        className="py-3 border-2"
                        required
                      />
                      <Form.Text className="text-muted">
                        The more details you provide, the faster we can help you.
                      </Form.Text>
                    </Form.Group>

                    {/* File Upload Section */}
                    <Form.Group className="mb-5">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <Form.Label className="fw-bold text-uppercase small text-muted mb-0">
                            Attachments
                          </Form.Label>
                          <p className="small text-muted mb-0">
                            Screenshots, screen recordings, or documents (Max 100MB each)
                          </p>
                        </div>
                        <Button
                          variant="outline-warning"
                          onClick={() => setActiveTab('recorder')}
                        >
                          <i className="fas fa-video me-2"></i>
                          Record Screen
                        </Button>
                      </div>
                      
                      <div className="border-2 border-dashed rounded-3 p-5 text-center bg-light">
                        <div className="mb-3">
                          <i className="fas fa-cloud-upload-alt fa-3x text-primary"></i>
                        </div>
                        <p className="mb-2">
                          <span className="fw-bold text-primary">Drag & drop files here</span> or click to browse
                        </p>
                        <p className="small text-muted mb-3">
                          Supports: Images (PNG, JPG), Videos (MP4, WEBM), Documents (PDF, DOC)
                        </p>
                        
                        <Form.Control
                          type="file"
                          id="file-upload"
                          onChange={handleFileChange}
                          accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.webm,.mp4"
                          className="d-none"
                          multiple
                        />
                        
                        <Form.Label 
                          htmlFor="file-upload" 
                          className="btn btn-primary mt-2"
                          style={{ cursor: 'pointer' }}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add Files
                        </Form.Label>
                      </div>
                      
                      {selectedFiles.length > 0 && (
                        <div className="mt-4">
                          <h6 className="mb-3">Attached Files ({selectedFiles.length}):</h6>
                          <div className="list-group">
                            {selectedFiles.map((file, fileIndex) => (
                              <div key={fileIndex} className="list-group-item d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                  {file.type.startsWith('video/') ? (
                                    <i className="fas fa-video text-danger me-3"></i>
                                  ) : file.type.startsWith('image/') ? (
                                    <i className="fas fa-image text-success me-3"></i>
                                  ) : (
                                    <i className="fas fa-file text-primary me-3"></i>
                                  )}
                                  <div>
                                    <div className="fw-bold text-truncate" style={{ maxWidth: '300px' }}>
                                      {file.name}
                                      {recordedVideos.includes(file) && (
                                        <Badge bg="danger" className="ms-2">
                                          <i className="fas fa-video me-1"></i>
                                          Recording
                                        </Badge>
                                      )}
                                    </div>
                                    <small className="text-muted">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB • 
                                      {file.type.split('/')[1].toUpperCase()}
                                    </small>
                                  </div>
                                </div>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => removeFile(fileIndex)}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Form.Group>

                    {/* Submit Button */}
                    <div className="pt-4 border-top">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-100 py-3 fw-bold fs-5"
                        style={{
                          background: 'linear-gradient(135deg, #0066cc 0%, #004d99 100%)',
                          border: 'none'
                        }}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Creating Ticket...'}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Submit Ticket
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </>
              ) : (
                <>
                  {/* Screen Recorder Tab */}
                  <div className="mb-4">
                    <Alert variant="info">
                      <h5 className="alert-heading">
                        <i className="fas fa-desktop me-2"></i>
                        Screen Recording Tool
                      </h5>
                      <p>
                        Record your screen to show developers exactly what's happening. 
                        This is especially helpful for:
                      </p>
                      <ul className="mb-0">
                        <li>Showing error messages that appear</li>
                        <li>Demonstrating steps to reproduce a bug</li>
                        <li>Showing unexpected system behavior</li>
                        <li>Explaining complex configuration issues</li>
                      </ul>
                    </Alert>
                    
                    <ScreenRecorder
                      onRecordingComplete={handleRecordingComplete}
                      ticketNumber="NEW"
                    />
                    
                    <div className="mt-4 p-4 bg-light rounded">
                      <h6 className="fw-bold mb-3">
                        <i className="fas fa-lightbulb me-2 text-warning"></i>
                        Tips for Great Screen Recordings
                      </h6>
                      <Row>
                        <Col md={4}>
                          <div className="d-flex align-items-start mb-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                              <i className="fas fa-1 text-primary"></i>
                            </div>
                            <div>
                              <strong>Be Specific</strong>
                              <p className="small text-muted mb-0">Focus on the exact issue area</p>
                            </div>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="d-flex align-items-start mb-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                              <i className="fas fa-2 text-primary"></i>
                            </div>
                            <div>
                              <strong>Talk Through It</strong>
                              <p className="small text-muted mb-0">Explain what you're doing and seeing</p>
                            </div>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="d-flex align-items-start mb-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                              <i className="fas fa-3 text-primary"></i>
                            </div>
                            <div>
                              <strong>Keep it Short</strong>
                              <p className="small text-muted mb-0">1-2 minutes is usually enough</p>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline-primary"
                        onClick={() => setActiveTab('form')}
                        className="px-5"
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Back to Ticket Form
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* FAQ Section */}
              <Accordion className="mt-5">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>
                    <i className="fas fa-question-circle me-2"></i>
                    Why should I record my screen?
                  </Accordion.Header>
                  <Accordion.Body>
                    Screen recordings help our developers see exactly what's happening, which:
                    <ul className="mt-2 mb-0">
                      <li>Reduces back-and-forth communication</li>
                      <li>Helps identify issues faster</li>
                      <li>Provides visual context that text can't capture</li>
                      <li>Shows error messages in real-time</li>
                      <li>Demonstrates user workflows that might have issues</li>
                    </ul>
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                  <Accordion.Header>
                    <i className="fas fa-shield-alt me-2"></i>
                    Is my screen recording secure?
                  </Accordion.Header>
                  <Accordion.Body>
                    Yes, your screen recordings are secure:
                    <ul className="mt-2 mb-0">
                      <li>Recordings are stored only on your device until you choose to attach them</li>
                      <li>We never access your screen without your permission</li>
                      <li>Recordings are only shared with authorized support staff</li>
                      <li>You can delete recordings at any time</li>
                      <li>No third-party has access to your recordings</li>
                    </ul>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateTicket;