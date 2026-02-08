import React, { useState, useRef, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Alert, ProgressBar,
  Badge, Modal, Form
} from 'react-bootstrap';

interface ScreenRecorderProps {
  onRecordingComplete: (recordingBlob: Blob, fileName: string) => void;
  ticketNumber: string;
}

const ScreenRecorder: React.FC<ScreenRecorderProps> = ({
  onRecordingComplete,
  ticketNumber
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingPreview, setRecordingPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [recordingSize, setRecordingSize] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startRecording = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const displayMediaOptions = {
        video: {
          displaySurface: 'window'
        },
        audio: audioEnabled
      };

      const mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      setStream(mediaStream);

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setRecordingSize(prev => prev + event.data.size);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedChunks(chunks);
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(blob);
        setRecordingPreview(previewUrl);
        
        // Set default recording name
        const date = new Date();
        const defaultName = `screen-recording-${ticketNumber}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.webm`;
        setRecordingName(defaultName);
        
        // Show preview modal
        setShowPreview(true);
      };

      recorder.onerror = (event) => {
        console.error('Recording error:', event);
        setError('An error occurred during recording');
      };

      setMediaRecorder(recorder);
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedChunks([]);
      setRecordingSize(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Handle when user stops sharing via browser controls
      mediaStream.getVideoTracks()[0].onended = () => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecording(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }
      };

    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Screen sharing permission was denied. Please allow access to record your screen.');
      } else if (err.name === 'NotFoundError') {
        setError('No screen sharing source available. Please check your display settings.');
      } else {
        setError('Failed to start screen recording: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const saveRecording = () => {
    if (recordedChunks.length === 0) return;

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const fileName = recordingName || `screen-recording-${ticketNumber}-${Date.now()}.webm`;
    
    onRecordingComplete(blob, fileName);
    
    // Cleanup
    if (recordingPreview) {
      URL.revokeObjectURL(recordingPreview);
    }
    
    setShowPreview(false);
    setRecordedChunks([]);
    setRecordingPreview(null);
    setRecordingName('');
    setRecordingSize(0);
  };

  const discardRecording = () => {
    if (recordingPreview) {
      URL.revokeObjectURL(recordingPreview);
    }
    
    setShowPreview(false);
    setRecordedChunks([]);
    setRecordingPreview(null);
    setRecordingName('');
    setRecordingSize(0);
    
    // Clean up stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Container>
      <Card className="border-0 shadow">
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <h4 className="fw-bold text-primary">
              <i className="fas fa-desktop me-2"></i>
              Screen Recorder
            </h4>
            <p className="text-muted">
              Record your screen to visually demonstrate the issue
            </p>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}

          {/* Recording Controls */}
          <div className="text-center mb-4">
            {!isRecording ? (
              <Button
                variant="danger"
                size="lg"
                onClick={startRecording}
                disabled={isLoading}
                className="px-5 py-3 rounded-pill"
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Initializing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-video me-2"></i>
                    Start Recording
                  </>
                )}
              </Button>
            ) : (
              <div>
                <Button
                  variant="warning"
                  size="lg"
                  onClick={stopRecording}
                  className="px-5 py-3 rounded-pill mb-3"
                >
                  <i className="fas fa-stop me-2"></i>
                  Stop Recording
                </Button>
                
                <div className="mt-3">
                  <Badge bg="danger" className="p-3 fs-6">
                    <i className="fas fa-circle me-2"></i>
                    Recording: {formatTime(recordingTime)}
                  </Badge>
                  <div className="mt-2">
                    <small className="text-muted">
                      Recording size: {formatFileSize(recordingSize)}
                    </small>
                  </div>
                </div>
                
                <Alert variant="info" className="mt-3">
                  <i className="fas fa-info-circle me-2"></i>
                  Click the "Stop Sharing" button in your browser to stop recording at any time.
                </Alert>
              </div>
            )}
          </div>

          {/* Audio Settings */}
          <Row className="mb-4">
            <Col md={6} className="offset-md-3">
              <Card className="border">
                <Card.Body>
                  <Form.Check
                    type="switch"
                    id="audio-switch"
                    label={
                      <>
                        <i className="fas fa-microphone me-2"></i>
                        Include microphone audio
                      </>
                    }
                    checked={audioEnabled}
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                    disabled={isRecording || isLoading}
                  />
                  <small className="text-muted">
                    Your voice narration helps explain the issue better
                  </small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Instructions */}
          <Row className="mt-4">
            <Col md={4}>
              <div className="text-center p-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                  <i className="fas fa-mouse-pointer fa-2x text-primary"></i>
                </div>
                <h6 className="fw-bold">Select Area</h6>
                <p className="small text-muted">
                  Choose the specific window or screen area to record
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center p-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                  <i className="fas fa-play-circle fa-2x text-primary"></i>
                </div>
                <h6 className="fw-bold">Record & Explain</h6>
                <p className="small text-muted">
                  Perform the steps while explaining what's happening
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center p-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                  <i className="fas fa-stop-circle fa-2x text-primary"></i>
                </div>
                <h6 className="fw-bold">Stop & Review</h6>
                <p className="small text-muted">
                  Stop when done and review your recording
                </p>
              </div>
            </Col>
          </Row>

          {/* Preview Modal */}
          <Modal
            show={showPreview}
            onHide={discardRecording}
            size="lg"
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <i className="fas fa-play-circle me-2 text-primary"></i>
                Recording Preview
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {recordingPreview && (
                <>
                  <div className="mb-3">
                    <video
                      ref={previewVideoRef}
                      src={recordingPreview}
                      controls
                      className="w-100 rounded"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Recording Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={recordingName}
                      onChange={(e) => setRecordingName(e.target.value)}
                      placeholder="Enter a descriptive name for your recording"
                    />
                  </Form.Group>
                  
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <Badge bg="info" className="me-2">
                        Duration: {formatTime(recordingTime)}
                      </Badge>
                      <Badge bg="secondary">
                        Size: {formatFileSize(recordingSize)}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={discardRecording}>
                <i className="fas fa-trash me-2"></i>
                Discard
              </Button>
              <Button variant="primary" onClick={saveRecording}>
                <i className="fas fa-save me-2"></i>
                Save & Attach to Ticket
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Browser Compatibility Check */}
          <Alert variant="warning" className="mt-4">
            <h6 className="alert-heading">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Browser Compatibility
            </h6>
            <p className="mb-2">Screen recording works best on:</p>
            <ul className="mb-0">
              <li>Chrome 74+</li>
              <li>Edge 79+</li>
              <li>Firefox 66+</li>
              <li>Safari 13+ (requires additional permissions)</li>
            </ul>
          </Alert>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ScreenRecorder;