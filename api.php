<?php
/**
 * api.php - Streamlined API handler for CryoCylinder Monitoring System
 *
 * This file replaces the complex logic in index.php with a cleaner API approach
 * that delivers JSON responses for the frontend application.
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session for user authentication
session_start();

// Set JSON content type
header('Content-Type: application/json');

/**
 * Helper function to load data from JSON files
 * @param string $path File path without extension
 * @param array $default Default value if file doesn't exist
 * @return array Data from file
 */
function loadData($path, $default = []) {
    $jsonPath = $path . '.json';
    $iniPath = $path . '.ini';
    
    // Try JSON first, then INI
    if (file_exists($jsonPath)) {
        $content = file_get_contents($jsonPath);
        if ($content !== false) {
            $data = json_decode($content, true);
            // Проверяем ошибки декодирования JSON
            if (json_last_error() === JSON_ERROR_NONE) {
                return $data;
            }
        }
    }
    
    // Fall back to INI
    if (file_exists($iniPath)) {
        $content = file_get_contents($iniPath);
        if ($content !== false) {
            // Сначала пробуем как JSON (для обратной совместимости)
            $data = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $data;
            }
            
            // Если это не JSON, пробуем как INI
            // Здесь должен быть код для обработки реального INI формата
            // В текущей реализации только JSON в INI файлах
        }
    }
    
    return $default;
}


/**
 * Helper function to generate a random ID
 * @param int $length Length of ID
 * @return string Random ID
 */
function generateId($length = 8) {
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
    $id = '';
    for ($i = 0; $i < $length; $i++) {  // Исправлено: добавлен $ перед i
        $id .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $id;
}

/**
 * Helper function to check if user has access to a specific cylinder
 * @param string $ccName Cylinder name
 * @param string $userRole User role
 * @param string $userCompany User company
 * @return bool True if access granted
 */
function hasAccess($ccName, $userRole, $userCompany) {
    // Валидация входных данных
    if (empty($ccName) || !is_string($ccName)) {
        return false;
    }
    
    // Проверяем, что $ccName не содержит ".." для предотвращения path traversal
    if (strpos($ccName, '..') !== false || strpos($ccName, '/') !== false) {
        return false;
    }
    
    // Admins and 'all' company users have access to everything
    if ($userRole === 'admin' || $userCompany === 'all') {
        return true;
    }
    
    // Проверяем существование директории
    $ccPath = './data/cc/' . $ccName;
    if (!is_dir($ccPath)) {
        return false;
    }
    
    // Check if cylinder belongs to user's company
    $ccData = loadData($ccPath . '/set');
    return isset($ccData['company']) && $ccData['company'] === $userCompany;
}

// Get request parameters
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$inputData = !empty($rawInput) ? json_decode($rawInput, true) : [];

// Process request based on action
switch ($action) {
    case 'cylinders':
        // Get list of cylinders
        $cylinders = [];
        $ccDir = './data/cc';
        
        if (is_dir($ccDir)) {
            $ccList = array_diff(scandir($ccDir), array('..', '.'));
            
            foreach ($ccList as $ccName) {
                $ccPath = $ccDir . '/' . $ccName;
                if (!is_dir($ccPath)) continue;
                
                // Check access rights
                if (!hasAccess($ccName, $_SESSION['role'], $_SESSION['company'])) {
                    continue;
                }
                
                // Load cylinder data
                $ccData = loadData($ccPath . '/set');
                if (empty($ccData)) continue;
                
                // Calculate level and pressure if calibration data exists
                $level = null;
                $pressure = null;
                
                if (isset($ccData['lADC']) && isset($ccData['mLvl']) && isset($ccData['dLvl'])) {
                    $level = round($ccData['lADC'] * $ccData['mLvl'] + $ccData['dLvl'], 2);
                }
                
                if (isset($ccData['prssOn']) && $ccData['prssOn'] == 1 && 
                    isset($ccData['pADC']) && isset($ccData['mPrss']) && isset($ccData['dPrss'])) {
                    $pressure = round($ccData['pADC'] * $ccData['mPrss'] + $ccData['dPrss'], 2);
                }
                
                // Add calculated values
                $ccData['level'] = $level;
                $ccData['pressure'] = $pressure;
                $ccData['name'] = $ccName;
                
                // Remove sensitive fields
                unset($ccData['ssid']);
                
                $cylinders[] = $ccData;
            }
        }
        
        echo json_encode([
            'status' => 'success',
            'data' => $cylinders
        ]);
        break;
        
    case 'cylinder':
        // Get details for a specific cylinder
        $ccName = $_GET['id'] ?? '';
        
        if (empty($ccName)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder ID is required',
                'code' => 400
            ]);
            exit;
        }
        
        $ccPath = './data/cc/' . $ccName;
        
        if (!is_dir($ccPath)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder not found',
                'code' => 404
            ]);
            exit;
        }
        
        // Check access rights
        if (!hasAccess($ccName, $_SESSION['role'], $_SESSION['company'])) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Access denied',
                'code' => 403
            ]);
            exit;
        }
        
        // Load cylinder data
        $ccData = loadData($ccPath . '/set');
        
        // Calculate level and pressure
        $level = null;
        $pressure = null;
        
        if (isset($ccData['lADC']) && isset($ccData['mLvl']) && isset($ccData['dLvl'])) {
            $level = round($ccData['lADC'] * $ccData['mLvl'] + $ccData['dLvl'], 2);
        }
        
        if (isset($ccData['prssOn']) && $ccData['prssOn'] == 1 && 
            isset($ccData['pADC']) && isset($ccData['mPrss']) && isset($ccData['dPrss'])) {
            $pressure = round($ccData['pADC'] * $ccData['mPrss'] + $ccData['dPrss'], 2);
        }
        
        // Add calculated values
        $ccData['level'] = $level;
        $ccData['pressure'] = $pressure;
        $ccData['name'] = $ccName;
        
        // Get history data if requested
        if (isset($_GET['history']) && $_GET['history'] === 'true') {
            $histFile = $ccPath . '/hist.json';
            $iniFile = $ccPath . '/hist.ini';
            $history = [];
            
            if (file_exists($histFile)) {
                $history = json_decode(file_get_contents($histFile), true) ?: [];
            } else if (file_exists($iniFile)) {
                // Parse legacy CSV format
                $lines = file($iniFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                
                foreach ($lines as $line) {
                    $parts = explode(',', $line);
                    if (count($parts) >= 3) {
                        $entry = [
                            'timestamp' => $parts[0],
                            'lADC' => $parts[1],
                            'pADC' => $parts[2],
                            'ubt' => $parts[3] ?? null
                        ];
                        
                        // Calculate level and pressure
                        if (isset($ccData['mLvl']) && isset($ccData['dLvl'])) {
                            $entry['level'] = round($entry['lADC'] * $ccData['mLvl'] + $ccData['dLvl'], 2);
                        }
                        
                        if (isset($ccData['prssOn']) && $ccData['prssOn'] == 1 && 
                            isset($ccData['mPrss']) && isset($ccData['dPrss'])) {
                            $entry['pressure'] = round($entry['pADC'] * $ccData['mPrss'] + $ccData['dPrss'], 2);
                        }
                        
                        $history[] = $entry;
                    }
                }
                
                // Limit to the most recent 100 entries
                $history = array_slice($history, -100);
            }
            
            $ccData['history'] = $history;
        }
        
        echo json_encode([
            'status' => 'success',
            'data' => $ccData
        ]);
        break;
        
    case 'update':
        // Update cylinder data
        if ($method !== 'POST') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed',
                'code' => 405
            ]);
            exit;
        }
        
        $ccName = $_GET['id'] ?? '';
        
        if (empty($ccName) || empty($inputData)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid request data',
                'code' => 400
            ]);
            exit;
        }
        
        $ccPath = './data/cc/' . $ccName;
        
        if (!is_dir($ccPath)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder not found',
                'code' => 404
            ]);
            exit;
        }
        
        // Only admins can update cylinders
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Permission denied',
                'code' => 403
            ]);
            exit;
        }
        
        // Load existing data
        $ccData = loadData($ccPath . '/set');
        
        // Update fields
        $allowedFields = [
            'company', 'gas', 'prssOn', 'vh', 'mUnit', 'sleep', 'vol', 'gasDens'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($inputData[$field])) {
                $ccData[$field] = $inputData[$field];
            }
        }
        
        // Save updated data
        $jsonStr = json_encode($ccData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $jsonResult = file_put_contents($ccPath . '/set.json', $jsonStr);

        // Also update the INI version for backward compatibility
        $iniResult = file_put_contents($ccPath . '/set.ini', json_encode($ccData, JSON_UNESCAPED_UNICODE));

        if ($jsonResult === false || $iniResult === false) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to save cylinder data',
                'code' => 500
            ]);
            exit;
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Cylinder updated successfully',
            'data' => $ccData
        ]);
        break;
        
    case 'calibrate':
        // Calibrate a cylinder
        if ($method !== 'POST') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed',
                'code' => 405
            ]);
            exit;
        }
        
        $ccName = $_GET['id'] ?? '';
        
        if (empty($ccName) || empty($inputData)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid request data',
                'code' => 400
            ]);
            exit;
        }
        
        $ccPath = './data/cc/' . $ccName;
        
        if (!is_dir($ccPath)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder not found',
                'code' => 404
            ]);
            exit;
        }
        
        // Only admins can calibrate cylinders
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Permission denied',
                'code' => 403
            ]);
            exit;
        }
        
        // Load existing data
        $ccData = loadData($ccPath . '/set');
        
        // Check if this is a manual calibration
        if (isset($inputData['l0']) && isset($inputData['l1']) && isset($ccData['vol'])) {
            $l0 = (int)$inputData['l0'];
            $l1 = (int)$inputData['l1'];
            $vol = (float)$ccData['vol'];
            
            // Validate input
            if ($l1 <= $l0 || $vol <= 0) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Invalid calibration values',
                    'code' => 400
                ]);
                exit;
            }
            
            // Calculate calibration parameters
            $mLvl = round($vol / ($l1 - $l0), 5);
            $dLvl = round(-$l0 * $mLvl, 3);
            
            // Update calibration data
            $ccData['mLvl'] = $mLvl;
            $ccData['dLvl'] = $dLvl;
            $ccData['nLvl'] = $l1 - $l0;
            $ccData['lstTm'] = date('Y-m-d H:i:s');
            
            // Save calibration to history
            $calibrData = [
                'timestamp' => date('Y-m-d H:i:s'),
                'l0' => $l0,
                'l1' => $l1,
                'vol' => $vol,
                'mLvl' => $mLvl,
                'dLvl' => $dLvl
            ];
            
            // Add calibration entry to calibr.json
            $calibrFile = $ccPath . '/calibr.json';
            $calibrHistory = file_exists($calibrFile) ? 
                json_decode(file_get_contents($calibrFile), true) : [];
                
            if (!is_array($calibrHistory)) $calibrHistory = [];
            $calibrHistory[] = $calibrData;
            
            file_put_contents($calibrFile, json_encode($calibrHistory, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            
            // Also update the INI version for backward compatibility
            file_put_contents($ccPath . '/calibr.ini', "[lvl]\nl0=$l0\nl1=$l1\nvol=$vol\n");
        } 
        // Pressure calibration
        else if (isset($inputData['p0']) && isset($inputData['p1'])) {
            $p0 = (int)$inputData['p0'];
            $p1 = (int)$inputData['p1'];
            
            // Проверяем наличие необходимых полей
            if (!isset($inputData['prss0']) || !isset($inputData['prss1'])) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Missing pressure values (prss0 and prss1 required)',
                    'code' => 400
                ]);
                exit;
            }
            
            $prss0 = (float)$inputData['prss0'];
            $prss1 = (float)$inputData['prss1'];
            
            // Validate input
            if ($p1 <= $p0) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Invalid pressure calibration values',
                    'code' => 400
                ]);
                exit;
            
            }
            
            // Calculate calibration parameters
            $mPrss = round(($prss1 - $prss0) / ($p1 - $p0), 6);
            $dPrss = round($prss0 - $p0 * $mPrss, 3);
            
            // Update calibration data
            $ccData['mPrss'] = $mPrss;
            $ccData['dPrss'] = $dPrss;
            $ccData['nPrss'] = $p1 - $p0;
            $ccData['lstTm'] = date('Y-m-d H:i:s');
        }
        else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Missing calibration parameters',
                'code' => 400
            ]);
            exit;
        }
        
        // Save updated data
        $jsonStr = json_encode($ccData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        file_put_contents($ccPath . '/set.json', $jsonStr);
        
        // Also update the INI version for backward compatibility
        file_put_contents($ccPath . '/set.ini', json_encode($ccData, JSON_UNESCAPED_UNICODE));
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Calibration successful',
            'data' => $ccData
        ]);
        break;
        
    case 'create':
        // Create a new cylinder
        if ($method !== 'POST') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed',
                'code' => 405
            ]);
            exit;
        }
        
        // Only admins can create cylinders
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Permission denied',
                'code' => 403
            ]);
            exit;
        }
        
        $ccName = $inputData['name'] ?? '';
        
        if (empty($ccName)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder name is required',
                'code' => 400
            ]);
            exit;
        }
        
        $ccPath = './data/cc/' . $ccName;
        
        // Check if cylinder already exists
        if (is_dir($ccPath)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder already exists',
                'code' => 409
            ]);
            exit;
        }
        
        // Create directory
        if (!mkdir($ccPath, 0755, true)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to create cylinder directory',
                'code' => 500
            ]);
            exit;
        }
        
        // Generate a unique ID
        $id = generateId(8);
        
        // Initialize cylinder data
        $ccData = [
            'id' => $id,
            'company' => $inputData['company'] ?? '',
            'gas' => '',
            'gasDens' => '',
            'vol' => '',
            'vh' => 'vert',
            'prssOn' => 1,
            'mUnit' => 'L',
            'sleep' => 1,
            'resp' => 1,
            'lstTm' => date('Y-m-d H:i:s')
        ];
        
        // Save data
        $jsonStr = json_encode($ccData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        file_put_contents($ccPath . '/set.json', $jsonStr);
        
        // Also save INI version for backward compatibility
        file_put_contents($ccPath . '/set.ini', json_encode($ccData, JSON_UNESCAPED_UNICODE));
        
        // Create empty history and calibration files
        file_put_contents($ccPath . '/hist.json', '[]');
        file_put_contents($ccPath . '/hist.ini', '');
        file_put_contents($ccPath . '/calibr.json', '[]');
        file_put_contents($ccPath . '/calibr.ini', '');
        
        // Create symlink from ID to CC directory
        $idPath = './data/id/' . $id;
        if (file_exists($idPath)) {
            unlink($idPath);
        }
        symlink('../cc/' . $ccName, $idPath);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Cylinder created successfully',
            'data' => $ccData
        ]);
        break;
        
    case 'delete':
        // Delete a cylinder
        if ($method !== 'DELETE' && $method !== 'POST') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed',
                'code' => 405
            ]);
            exit;
        }
        
        $ccName = $_GET['id'] ?? '';
        
        if (empty($ccName)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder ID is required',
                'code' => 400
            ]);
            exit;
        }
        
        // Only admins can delete cylinders
        if ($_SESSION['role'] !== 'admin') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Permission denied',
                'code' => 403
            ]);
            exit;
        }
        
        $ccPath = './data/cc/' . $ccName;
        
        if (!is_dir($ccPath)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Cylinder not found',
                'code' => 404
            ]);
            exit;
        }
        
        // Get ID to remove symlink
        $ccData = loadData($ccPath . '/set');
        $id = $ccData['id'] ?? null;
        
        // Remove symlink if it exists
        if ($id && file_exists('./data/id/' . $id)) {
            unlink('./data/id/' . $id);
        }
        
        $allFiles = array_merge(
            glob("$ccPath/*.*"),  // Файлы с расширениями
            glob("$ccPath/*", GLOB_NOSORT) // Все файлы включая без расширений
        );
        
        // Удаляем только файлы (не директории)
        foreach ($allFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        
        // Remove directory
        if (rmdir($ccPath)) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Cylinder deleted successfully'
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to delete cylinder directory',
                'code' => 500
            ]);
        }
        break;
        
    case 'settings':
        // Get or update application settings
        if ($method === 'GET') {
            // Get all settings
            $settings = [
                'gases' => loadData('./data/gases', []),
                'companies' => loadData('./data/companies', []),
                'userRole' => $_SESSION['role'],
                'userCompany' => $_SESSION['company'],
                'userName' => $_SESSION['user']
            ];
            
            echo json_encode([
                'status' => 'success',
                'data' => $settings
            ]);
        } 
        else if ($method === 'POST') {
            // Only admins can update settings
            if ($_SESSION['role'] !== 'admin') {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Permission denied',
                    'code' => 403
                ]);
                exit;
            }
            
            $settingType = $_GET['type'] ?? '';
            $validTypes = ['gases', 'companies', 'users'];
            
            if (!in_array($settingType, $validTypes)) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Invalid setting type',
                    'code' => 400
                ]);
                exit;
            }
            
            if ($settingType === 'gases') {
                // Update gases
                $gases = loadData('./data/gases', []);
                
                if (isset($inputData['add']) && isset($inputData['name']) && isset($inputData['density'])) {
                    $gases[$inputData['name']] = $inputData['density'];
                } 
                else if (isset($inputData['remove']) && isset($inputData['name'])) {
                    unset($gases[$inputData['name']]);
                }
                
                file_put_contents('./data/gases.json', json_encode($gases, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                file_put_contents('./data/gases.ini', json_encode($gases, JSON_UNESCAPED_UNICODE));
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Gases updated successfully',
                    'data' => $gases
                ]);
            }
            else if ($settingType === 'companies') {
                // Update companies
                $companies = loadData('./data/companies', []);
                
                if (isset($inputData['add']) && isset($inputData['name'])) {
                    if (!in_array($inputData['name'], $companies)) {
                        $companies[] = $inputData['name'];
                    }
                } 
                else if (isset($inputData['remove']) && isset($inputData['name'])) {
                    $index = array_search($inputData['name'], $companies);
                    if ($index !== false) {
                        unset($companies[$index]);
                        $companies = array_values($companies); // Reindex array
                    }
                }
                
                file_put_contents('./data/companies.json', json_encode($companies, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                file_put_contents('./data/companies.ini', json_encode($companies, JSON_UNESCAPED_UNICODE));
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Companies updated successfully',
                    'data' => $companies
                ]);
            }
            else if ($settingType === 'users') {
                // Update users
                $users = loadData('./data/users', []);
                
                if (isset($inputData['add']) && isset($inputData['name']) && 
                    isset($inputData['password']) && isset($inputData['role']) && 
                    isset($inputData['company'])) {
                    
                    // Check if user already exists
                    $exists = false;
                    foreach ($users as $index => $user) {
                        if ($user['name'] === $inputData['name']) {
                            // Update existing user
                            $users[$index] = [
                                'name' => $inputData['name'],
                                'password' => $inputData['password'],
                                'role' => $inputData['role'],
                                'company' => $inputData['company']
                            ];
                            $exists = true;
                            break;
                        }
                    }
                    
                    if (!$exists) {
                        // Add new user
                        $users[] = [
                            'name' => $inputData['name'],
                            'password' => $inputData['password'],
                            'role' => $inputData['role'],
                            'company' => $inputData['company']
                        ];
                    }
                } 
                else if (isset($inputData['remove']) && isset($inputData['name'])) {
                    foreach ($users as $index => $user) {
                        if ($user['name'] === $inputData['name']) {
                            unset($users[$index]);
                            $users = array_values($users); // Reindex array
                            break;
                        }
                    }
                }
                
                file_put_contents('./data/users.json', json_encode($users, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Users updated successfully',
                    'data' => $users
                ]);
            }
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed',
                'code' => 405
            ]);
        }
        break;
        
    case 'login':
        // Handle login (already checked at the beginning)
        echo json_encode([
            'status' => 'success',
            'message' => 'Already authenticated',
            'user' => [
                'name' => $_SESSION['user'],
                'role' => $_SESSION['role'],
                'company' => $_SESSION['company']
            ]
        ]);
        break;
        
    case 'logout':
        // Handle logout
        session_destroy();
        echo json_encode([
            'status' => 'success',
            'message' => 'Logged out successfully'
        ]);
        break;
        
    default:
        echo json_encode([
            'status' => 'error',
            'message' => 'Unknown action',
            'code' => 400
        ]);
}