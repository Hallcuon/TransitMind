import React from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary component to catch and display React errors gracefully
 * Usage: Wrap any component in <ErrorBoundary><YourComponent /></ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <h1>⚠️ Something went wrong</h1>
            <p>We're sorry, but the application encountered an unexpected error.</p>
            
            {isDev && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.resetError} className="btn btn-primary">
                Try Again
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                className="btn btn-secondary"
              >
                Go Home
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <p className="error-warning">
                ⚠️ Multiple errors detected. Please refresh the page or contact support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
