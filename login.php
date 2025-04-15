<?php
/**
 * login.php - Streamlined login handler for CryoCylinder Monitoring System
 *
 * This file provides a clean login handler with proper security considerations
 * and consistent session management.
 */

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session
session_start();

// Set response type to JSON
header('Content-Type: application/json');

/**
 * Helper function to load data from JSON files
 */
function loadUserData() {
    $jsonPath = __DIR__ . '/data/users.json';
    $iniPath = __DIR__ . '/data/usrs.ini'; // Legacy format
    
    // Try JSON first
    if (file_exists($jsonPath)) {
        $content = file_get_contents($jsonPath);
        $data = json_decode($content, true);
        if ($data !== null) {
            return $data;
        }
    }
    
    // Fall back to legacy format
    if (file_exists($iniPath)) {
        $content = file_get_contents($iniPath);
        $legacyData = json_decode($content, true);
        
        // Convert legacy format to new format
        if ($legacyData !== null) {
            $users = [];
            foreach ($legacyData as $username => $userId) {
                $users[] = [
                    'name' => $username,
                    'password' => $username === 'admin' ? file_get_contents(__DIR__ . '/data/pssw.ini') : generatePassword(),
                    'role' => $username === 'admin' ? 'admin' : 'user',
                    'company' => 'all'
                ];
            }
            
            // Save converted data to new format
            file_put_contents($jsonPath, json_encode($users, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            
            return $users;
        }
    }
    
    // Create default admin user if no user file exists
    $defaultAdmin = [
        [
            'name' => 'admin',
            'password' => 'admin123',
            'role' => 'admin',
            'company' => 'all'
        ]
    ];
    
    // Save default admin
    if (!is_dir(__DIR__ . '/data')) {
        mkdir(__DIR__ . '/data', 0755, true);
    }
    file_put_contents($jsonPath, json_encode($defaultAdmin, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    return $defaultAdmin;
}

/**
 * Helper function to generate a random password
 */
function generatePassword($length = 8) {
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $password = '';
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $password;
}

/**
 * Helper function to log authentication attempts
 */
function logAuth($message) {
    $logFile = __DIR__ . '/data/auth.log';
    file_put_contents(
        $logFile, 
        date('Y-m-d H:i:s') . " - $message\n", 
        FILE_APPEND
    );
}

/**
 * Helper function to track login attempts for rate limiting
 */
function trackLoginAttempt($username, $success) {
    $logFile = __DIR__ . '/data/login_attempts.json';
    
    $attempts = [];
    if (file_exists($logFile)) {
        $attempts = json_decode(file_get_contents($logFile), true) ?: [];
    }
    
    // Clean up old attempts (older than 1 hour)
    $now = time();
    $attempts = array_filter($attempts, function($attempt) use ($now) {
        return ($now - $attempt['time']) < 3600;
    });
    
    // Add current attempt
    $attempts[] = [
        'username' => $username,
        'ip' => $_SERVER['REMOTE_ADDR'],
        'time' => $now,
        'success' => $success
    ];
    
    // Save updated attempts
    file_put_contents($logFile, json_encode($attempts, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    // Count recent failed attempts from this IP
    $recentFailures = 0;
    foreach ($attempts as $attempt) {
        if ($attempt['ip'] === $_SERVER['REMOTE_ADDR'] && 
            !$attempt['success'] && 
            ($now - $attempt['time']) < 600) { // Last 10 minutes
            $recentFailures++;
        }
    }
    
    return $recentFailures;
}

/**
 * Main login handling code
 */
// Check if this is a logout request
if (isset($_GET['logout'])) {
    // Destroy session
    session_unset();
    session_destroy();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Logged out successfully'
    ]);
    exit;
}

// Check if user is already logged in
if (isset($_SESSION['user']) && isset($_SESSION['role'])) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Already logged in',
        'user' => [
            'name' => $_SESSION['user'],
            'role' => $_SESSION['role'],
            'company' => $_SESSION['company'] ?? 'all'
        ]
    ]);
    exit;
}

// Handle login request
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true);

if (!$inputData || !isset($inputData['login']) || !isset($inputData['password'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing login credentials'
    ]);
    exit;
}

$username = trim($inputData['login']);
$password = $inputData['password'];

// Rate limiting check
$recentFailures = trackLoginAttempt($username, false); // Mark as failure initially
if ($recentFailures > 5) {
    logAuth("Too many failed login attempts for user: $username from IP: {$_SERVER['REMOTE_ADDR']}");
    echo json_encode([
        'status' => 'error',
        'message' => 'Too many failed login attempts. Please try again later.'
    ]);
    exit;
}

// Load user data
$users = loadUserData();

// Check credentials
$authenticated = false;
$userData = null;

foreach ($users as $user) {
    if ($user['name'] === $username && $user['password'] === $password) {
        $authenticated = true;
        $userData = $user;
        break;
    }
}

// Special case for legacy admin password
if (!$authenticated && $username === 'admin') {
    $legacyPasswordFile = __DIR__ . '/data/pssw.ini';
    if (file_exists($legacyPasswordFile)) {
        $adminPassword = trim(file_get_contents($legacyPasswordFile));
        if ($password === $adminPassword) {
            $authenticated = true;
            $userData = [
                'name' => 'admin',
                'role' => 'admin',
                'company' => 'all'
            ];
        }
    }
}

// Handle authentication result
if ($authenticated) {
    // Update login attempt record to success
    trackLoginAttempt($username, true);
    
    // Set session data
    $_SESSION['user'] = $userData['name'];
    $_SESSION['role'] = $userData['role'];
    $_SESSION['company'] = $userData['company'] ?? 'all';
    
    logAuth("Successful login for user: $username");
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Login successful',
        'user' => [
            'name' => $userData['name'],
            'role' => $userData['role'],
            'company' => $userData['company'] ?? 'all'
        ]
    ]);
} else {
    logAuth("Failed login attempt for user: $username");
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid username or password'
    ]);
}