/**
 * init.js - Improved initialization script for CryoCylinder Monitoring System
 * This script properly loads all required modules and initializes the application
 */

// Ensure all modules are loaded before initializing the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, starting application initialization...');
    
    // Check if all required objects are available
    const checkModules = function() {
        const requiredModules = ['UI', 'API', 'Utils', 'App', 'Dashboard', 'Cylinders', 'Settings'];
        let allModulesLoaded = true;
        let missingModules = [];
        
        requiredModules.forEach(module => {
            if (!window[module]) {
                allModulesLoaded = false;
                missingModules.push(module);
            }
        });
        
        return { 
            loaded: allModulesLoaded, 
            missing: missingModules 
        };
    };
    
    // Initialize the application once all modules are loaded
    const initializeApp = function() {
        console.log('Initializing CryoCylinder Monitoring System...');
        
        try {
            // Ensure UI is initialized first
            if (window.UI && typeof UI.init === 'function') {
                UI.init();
                console.log('UI module initialized');
            } else {
                console.warn('UI.init is not available, some features may not work correctly');
            }
            
            // Ensure Bootstrap is available for modals
            if (typeof bootstrap === 'undefined') {
                console.warn('Bootstrap not loaded. Modal dialogs may not work properly.');
            }
            
            // Initialize main application
            if (window.App && typeof App.init === 'function') {
                App.init();
                console.log('App module initialized');
            } else {
                showError('App initialization module not found');
            }
            
            // Verify Dashboard and Cylinders modules
            if (!window.Dashboard || typeof Dashboard.update !== 'function') {
                console.warn('Dashboard module not loaded or incomplete');
            }
            
            if (!window.Cylinders || typeof Cylinders.updateList !== 'function') {
                console.warn('Cylinders module not loaded or incomplete');
            }
        } catch (error) {
            console.error('Error during application initialization:', error);
            showError('Failed to initialize application: ' + error.message);
        }
    };
    
    // Display error message to user
    const showError = function(message) {
        console.error('Initialization error:', message);
        
        // Create error element if it doesn't exist
        let errorContainer = document.getElementById('appInitError');
        
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'appInitError';
            errorContainer.style.position = 'fixed';
            errorContainer.style.top = '50%';
            errorContainer.style.left = '50%';
            errorContainer.style.transform = 'translate(-50%, -50%)';
            errorContainer.style.backgroundColor = '#f8d7da';
            errorContainer.style.color = '#721c24';
            errorContainer.style.padding = '20px';
            errorContainer.style.borderRadius = '5px';
            errorContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            errorContainer.style.zIndex = '9999';
            errorContainer.style.maxWidth = '80%';
            document.body.appendChild(errorContainer);
        }
        
        errorContainer.innerHTML = `
            <h3>Application Initialization Error</h3>
            <p>${message}</p>
            <div style="margin-top: 15px;">
                <button onclick="location.reload()" style="padding: 5px 10px; cursor: pointer;">
                    Reload Application
                </button>
            </div>
        `;
    };
    
    // Check if Chart.js is available
    const checkChartJs = function() {
        return typeof Chart !== 'undefined';
    };
    
    // Try to load Chart.js if not available
    const loadChartJs = function() {
        return new Promise((resolve, reject) => {
            if (checkChartJs()) {
                resolve();
                return;
            }
            
            console.log('Loading Chart.js...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                console.log('Chart.js loaded successfully');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Chart.js'));
            document.head.appendChild(script);
        });
    };
    
    // Main initialization flow
    const initFlow = async function() {
        try {
            // Hide the app content and show loading indicator
            const appView = document.getElementById('appView');
            const loginView = document.getElementById('loginView');
            const loadingOverlay = document.getElementById('loadingOverlay');
            
            if (appView) appView.classList.add('d-none');
            if (loginView) loginView.classList.add('d-none');
            if (loadingOverlay) loadingOverlay.classList.remove('d-none');
            
            // Try to load Chart.js
            await loadChartJs();
            
            // Check if all modules are loaded
            const moduleCheck = checkModules();
            if (!moduleCheck.loaded) {
                showError(`Required modules not found: ${moduleCheck.missing.join(', ')}`);
                return;
            }
            
            // Initialize the application
            initializeApp();
            
            // Once everything is initialized, we can hide the loading overlay
            if (loadingOverlay) {
                // Keep loading visible until App initialization completes
                setTimeout(() => {
                    if (loadingOverlay) {
                        loadingOverlay.classList.add('d-none');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Failed to initialize the application: ' + error.message);
        }
    };
    
    // Start initialization
    initFlow();
});