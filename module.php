<?php
/**
 * module.php - Simplified handler for ESP module communications
 *
 * This file replaces the complex module handling in index.php with a cleaner approach
 * focused specifically on module data exchange.
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * Helper function to load data from JSON/INI files
 */
function loadData($path, $default = []) {
    $jsonPath = $path . '.json';
    $iniPath = $path . '.ini';
    
    // Try JSON first, then INI
    if (file_exists($jsonPath)) {
        $content = file_get_contents($jsonPath);
        $data = json_decode($content, true);
        if ($data !== null) {
            return $data;
        }
    }
    
    // Fall back to INI
    if (file_exists($iniPath)) {
        $content = file_get_contents($iniPath);
        $data = json_decode($content, true);
        if ($data !== null) {
            return $data;
        }
    }
    
    return $default;
}

/**
 * Helper function to save data to both JSON and INI
 */
function saveData($path, $data) {
    // Save as JSON (pretty-printed for readability)
    file_put_contents(
        $path . '.json', 
        json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
    );
    
    // Also save as INI for backward compatibility
    file_put_contents(
        $path . '.ini', 
        json_encode($data, JSON_UNESCAPED_UNICODE)
    );
}

/**
 * Helper function to generate a random ID
 */
function generateId($length = 8) {
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
    $id = '';
    for ($i = 0; $i < $length; $i++) {
        $id .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $id;
}

/**
 * Handler for module initialization
 */
function handleModuleInit($data) {
    // Required fields check
    if (empty($data['cc']) || empty($data['ssid']) || empty($data['ssidPsw'])) {
        return false;
    }
    
    // Validate admin password (simple validation for this example)
    $adminPassword = '';
    $users = loadData('./data/users');
    
    foreach ($users as $user) {
        if ($user['role'] === 'admin' && (!isset($data['admPsw']) || $user['password'] === $data['admPsw'])) {
            $adminPassword = $user['password'];
            break;
        }
    }
    
    if (empty($adminPassword)) {
        // If no admin password found, try legacy password file
        if (file_exists('./data/pssw.ini')) {
            $adminPassword = trim(file_get_contents('./data/pssw.ini'));
            if ($data['admPsw'] !== $adminPassword) {
                return false;
            }
        } else {
            return false;
        }
    }
    
    // Add the SSID to the global list if it doesn't exist
    $ssidData = loadData('./data/ssid', []);
    if (!isset($ssidData[$data['ssid']])) {
        $ssidData[$data['ssid']] = $data['ssidPsw'];
        saveData('./data/ssid', $ssidData);
    }
    
    // Check if the cryocylinder already exists
    $ccPath = './data/cc/' . $data['cc'];
    
    if (!is_dir($ccPath)) {
        // Create new cryocylinder directory
        if (!mkdir($ccPath, 0755, true)) {
            return false;
        }
        
        // Generate a new unique ID
        $id = generateId(8);
        
        // Create initial configuration
        $ccData = [
            'id' => $id,
            'ssid' => [$data['ssid'] => $data['ssidPsw']],
            'vol' => '',
            'vh' => 'vert',
            'prssOn' => 1,
            'mUnit' => 'L',
            'sleep' => 1,
            'company' => $data['company'] ?? 'Default',
            'resp' => 1
        ];
        
        // Save configuration
        saveData($ccPath . '/set', $ccData);
        
        // Create empty history and calibration files
        file_put_contents($ccPath . '/hist.json', '[]');
        file_put_contents($ccPath . '/hist.ini', '');
        file_put_contents($ccPath . '/calibr.json', '[]');
        file_put_contents($ccPath . '/calibr.ini', '');
        
        // Create symlink from ID to CC directory
        $idPath = './data/id/' . $id;
        if (!is_dir('./data/id')) {
            mkdir('./data/id', 0755, true);
        }
        symlink("../cc/{$data['cc']}", $idPath);
        
        // Prepare response for module
        $response = $ccData;
        $response['ssid'] = array_keys($ccData['ssid']);
        $response['ssidPsw'] = array_values($ccData['ssid']);
        
        return $response;
    } else {
        // Load existing configuration
        $ccData = loadData($ccPath . '/set');
        
        // Add/update SSID
        if (!isset($ccData['ssid'])) {
            $ccData['ssid'] = [];
        }
        
        $ccData['ssid'][$data['ssid']] = $data['ssidPsw'];
        $ccData['resp'] = 1; // Mark for response to device
        
        // Save updated configuration
        saveData($ccPath . '/set', $ccData);
        
        // Prepare response for module
        $response = $ccData;
        $response['ssid'] = array_keys($ccData['ssid']);
        $response['ssidPsw'] = array_values($ccData['ssid']);
        
        return $response;
    }
}

/**
 * Handler for regular data updates from module
 */
function handleModuleUpdate($data) {
    // Required fields check
    if (empty($data['id']) || !isset($data['lADC']) || !isset($data['ubt'])) {
        return null;
    }
    
    // Find the cylinder by ID
    $idPath = './data/id/' . $data['id'];
    if (!is_link($idPath) || !file_exists($idPath)) {
        return null;
    }
    
    // Get the actual path
    $ccPath = realpath($idPath);
    if (!$ccPath || !is_dir($ccPath)) {
        return null;
    }
    
    // Load existing configuration
    $ccData = loadData($ccPath . '/set');
    if (empty($ccData)) {
        return null;
    }
    
    // Update ADC values and timestamp
    $ccData['lADC'] = $data['lADC'];
    $ccData['ubt'] = $data['ubt'];
    $ccData['lstTm'] = date('Y-m-d H:i:s');
    
    if (isset($ccData['prssOn']) && $ccData['prssOn'] == 1 && isset($data['pADC'])) {
        $ccData['pADC'] = $data['pADC'];
    }
    
    // Add to history file
    $historyEntry = [
        'timestamp' => $ccData['lstTm'],
        'lADC' => $data['lADC'],
        'pADC' => isset($data['pADC']) ? $data['pADC'] : null,
        'ubt' => $data['ubt']
    ];
    
    // Update history.json
    $historyFile = $ccPath . '/hist.json';
    $history = file_exists($historyFile) ? 
        json_decode(file_get_contents($historyFile), true) : [];
    
    if (!is_array($history)) $history = [];
    
    // Add new entry and keep only the latest 1000 entries
    $history[] = $historyEntry;
    if (count($history) > 1000) {
        $history = array_slice($history, -1000);
    }
    
    file_put_contents($historyFile, json_encode($history, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    // Also update the INI/CSV format for backward compatibility
    $csvLine = implode(',', [
        $historyEntry['timestamp'],
        $historyEntry['lADC'],
        $historyEntry['pADC'] ?? '-',
        $historyEntry['ubt']
    ]) . "\n";
    
    file_put_contents($ccPath . '/hist.ini', $csvLine, FILE_APPEND);
    
    // Prepare response if needed
    $response = null;
    
    // Check if we need to send calibration data back
    if (isset($data['resp']) && isset($ccData['resp']) && 
        $data['resp'] > 0 && $data['resp'] == $ccData['resp']) {
        // Module confirmed receipt of configuration, reset resp flag
        $ccData['resp'] = 0;
    } 
    // Send calibration parameters if they exist
    else if ((isset($ccData['mLvl']) && $ccData['mLvl'] != 0) || 
             (isset($ccData['mPrss']) && $ccData['mPrss'] != 0)) {
        
        $response = [
            'mLvl' => $ccData['mLvl'] ?? 0,
            'dLvl' => $ccData['dLvl'] ?? 0,
            'resp' => $ccData['resp'] ?? 0
        ];
        
        if (isset($ccData['prssOn']) && $ccData['prssOn'] == 1) {
            $response['mPrss'] = $ccData['mPrss'] ?? 0;
            $response['dPrss'] = $ccData['dPrss'] ?? 0;
        }
    }
    
    // Save updated configuration
    saveData($ccPath . '/set', $ccData);
    
    // Log the interaction for debugging
    $logEntry = date('Y-m-d H:i:s') . " - Module ID: {$data['id']}\n";
    $logEntry .= "Received: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
    $logEntry .= "Response: " . ($response ? json_encode($response, JSON_UNESCAPED_UNICODE) : "none") . "\n\n";
    
    file_put_contents('./data/module.log', $logEntry, FILE_APPEND);
    
    return $response;
}

// Main execution
if (isset($_GET['tm'])) {
    $requestData = json_decode($_GET['tm'], true);
    
    if (!$requestData) {
        // Invalid JSON
        exit;
    }
    
    // Determine request type and handle accordingly
    if (isset($requestData['cc'])) {
        // Module initialization request
        $response = handleModuleInit($requestData);
        if ($response) {
            echo '#' . json_encode($response, JSON_UNESCAPED_UNICODE);
        }
    } 
    else if (isset($requestData['id'])) {
        // Regular data update
        $response = handleModuleUpdate($requestData);
        if ($response) {
            echo '#' . json_encode($response, JSON_UNESCAPED_UNICODE);
        }
    }
} else {
    // Return simple help text for direct access
    header('Content-Type: text/plain');
    echo "CryoCylinder Module API\n";
    echo "------------------------\n";
    echo "This API endpoint is for ESP module communication only.\n";
    echo "Please use the web interface for human interaction.";
}