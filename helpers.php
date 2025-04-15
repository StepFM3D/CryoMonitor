<?php
/**
 * CryoCylinder Monitoring System - helpers.php
 * Вспомогательные функции для работы с данными и файлами
 */

/**
 * Загружает данные из JSON или INI файла
 * @param string $path Путь к файлу без расширения
 * @param array $default Значение по умолчанию если файл не существует
 * @return array Данные из файла
 */
function loadData($path, $default = []) {
    $jsonPath = $path . '.json';
    $iniPath = $path . '.ini';
    
    // Сначала пробуем JSON, затем INI
    if (file_exists($jsonPath)) {
        $content = file_get_contents($jsonPath);
        $data = json_decode($content, true);
        if ($data !== null) {
            return $data;
        }
    }
    
    // Пробуем INI формат
    if (file_exists($iniPath)) {
        $content = file_get_contents($iniPath);
        
        // Пытаемся декодировать как JSON (новый формат в старом файле)
        $data = json_decode($content, true);
        if ($data !== null) {
            return $data;
        }
        
        // Проверяем, может быть это формат CSV (для истории)
        if (strpos($path, '/hist') !== false) {
            $lines = explode("\n", $content);
            $result = [];
            
            foreach ($lines as $line) {
                $line = trim($line);
                if (!empty($line)) {
                    $parts = explode(",", $line);
                    if (count($parts) >= 3) {
                        $result[] = [
                            "timestamp" => $parts[0],
                            "lADC" => $parts[1],
                            "pADC" => $parts[2],
                            "ubt" => isset($parts[3]) ? $parts[3] : null
                        ];
                    }
                }
            }
            
            return $result;
        }
    }
    
    return $default;
}

/**
 * Сохраняет данные в JSON и INI файлы
 * @param string $path Путь к файлу без расширения
 * @param array $data Данные для сохранения
 * @return bool Успешность операции
 */
function saveData($path, $data) {
    // Убедимся, что директория существует
    $directory = dirname($path);
    if (!is_dir($directory)) {
        if (!mkdir($directory, 0755, true)) {
            return false;
        }
    }
    
    // Сохраняем в JSON (с красивым форматированием для читаемости)
    $jsonSuccess = file_put_contents(
        $path . '.json', 
        json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
    ) !== false;
    
    // Также сохраняем в INI для обратной совместимости
    $iniSuccess = file_put_contents(
        $path . '.ini', 
        json_encode($data, JSON_UNESCAPED_UNICODE)
    ) !== false;
    
    return $jsonSuccess && $iniSuccess;
}

/**
 * Генерирует случайный ID
 * @param int $length Длина ID
 * @return string Случайный ID
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
 * Проверяет, имеет ли пользователь доступ к цилиндру
 * @param string $ccName Имя цилиндра
 * @param string $userRole Роль пользователя
 * @param string $userCompany Компания пользователя
 * @return bool True если доступ разрешен
 */
function hasAccess($ccName, $userRole, $userCompany) {
    // Администраторы и пользователи с компанией 'all' имеют доступ ко всему
    if ($userRole === 'admin' || $userCompany === 'all') {
        return true;
    }
    
    // Проверяем, принадлежит ли цилиндр компании пользователя
    $ccData = loadData('./data/cc/' . $ccName . '/set');
    return isset($ccData['company']) && $ccData['company'] === $userCompany;
}

/**
 * Логирует сообщение в файл
 * @param string $message Сообщение для записи
 * @param string $file Имя файла журнала
 */
function logMessage($message, $file = 'system.log') {
    $logFile = __DIR__ . '/data/' . $file;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "$timestamp - $message\n";
    
    file_put_contents($logFile, $logMessage, FILE_APPEND);
}

/**
 * Проверяет структуру файлов и создает отсутствующие директории
 * @return array Результат проверки
 */
function checkFileStructure() {
    $result = [
        'status' => 'success',
        'message' => 'Структура файлов в порядке',
        'directories' => [],
        'files' => []
    ];
    
    // Проверяем необходимые директории
    $directories = [
        './data',
        './data/cc',
        './data/id'
    ];
    
    foreach ($directories as $dir) {
        if (!is_dir($dir)) {
            $result['directories'][$dir] = false;
            $result['status'] = 'warning';
            $result['message'] = 'Некоторые директории отсутствуют';
            
            // Создаем отсутствующую директорию
            if (mkdir($dir, 0755, true)) {
                $result['directories'][$dir] = 'created';
            } else {
                $result['status'] = 'error';
                $result['message'] = 'Не удалось создать необходимые директории';
            }
        } else {
            $result['directories'][$dir] = true;
        }
    }
    
    // Проверяем необходимые файлы
    $files = [
        './data/users.json' => [
            [
                "name" => "admin",
                "password" => "admin123",
                "role" => "admin",
                "company" => "all"
            ]
        ],
        './data/companies.json' => ["CryoCo", "ThermalTech", "FrostIndustries"],
        './data/gases.json' => ["Nitrogen" => "0.808", "Oxygen" => "1.141", "Helium" => "0.164"],
        './data/ssid.json' => ["CryoWiFi" => "cryo123"]
    ];
    
    foreach ($files as $file => $defaultData) {
        if (!file_exists($file)) {
            $result['files'][$file] = false;
            $result['status'] = $result['status'] === 'success' ? 'warning' : $result['status'];
            $result['message'] = 'Некоторые файлы отсутствуют';
            
            // Создаем отсутствующий файл с данными по умолчанию
            if (file_put_contents($file, json_encode($defaultData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
                $result['files'][$file] = 'created';
                
                // Также создаем INI версию для обратной совместимости
                $iniFile = str_replace('.json', '.ini', $file);
                file_put_contents($iniFile, json_encode($defaultData, JSON_UNESCAPED_UNICODE));
            } else {
                $result['status'] = 'error';
                $result['message'] = 'Не удалось создать необходимые файлы';
            }
        } else {
            $result['files'][$file] = true;
        }
    }
    
    // Создаем лог операции
    logMessage("Проверка структуры файлов: " . $result['status'] . " - " . $result['message']);
    
    return $result;
}

/**
 * Создает бэкап данных системы
 * @return string Путь к файлу бэкапа
 */
function createBackup() {
    $backupDir = __DIR__ . '/data/backup';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }
    
    $backupFile = $backupDir . '/backup_' . date('Y-m-d_H-i-s') . '.zip';
    $dataDir = __DIR__ . '/data';
    
    $zip = new ZipArchive();
    if ($zip->open($backupFile, ZipArchive::CREATE) === TRUE) {
        // Рекурсивная функция для добавления файлов в архив
        $addFilesToZip = function($directory, $zipObj, $excludeDir = '') use (&$addFilesToZip) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($directory),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            
            foreach ($files as $name => $file) {
                if (!$file->isDir() && strpos($name, $excludeDir) === false) {
                    $filePath = $file->getRealPath();
                    $relativePath = substr($filePath, strlen(__DIR__) + 1);
                    $zipObj->addFile($filePath, $relativePath);
                }
            }
        };
        
        // Добавляем файлы, исключая директорию backup
        $addFilesToZip($dataDir, $zip, '/backup/');
        
        $zip->close();
        
        logMessage("Создан бэкап: $backupFile");
        return $backupFile;
    } else {
        logMessage("Ошибка создания бэкапа", 'error.log');
        return false;
    }
}

/**
 * Сбрасывает систему к настройкам по умолчанию
 * @param bool $preserveUsers Сохранить пользователей
 * @return bool Успешность операции
 */
function resetSystem($preserveUsers = true) {
    // Создаем бэкап перед сбросом
    createBackup();
    
    // Сохраняем данные пользователей если нужно
    $users = [];
    if ($preserveUsers && file_exists(__DIR__ . '/data/users.json')) {
        $users = json_decode(file_get_contents(__DIR__ . '/data/users.json'), true);
    }
    
    // Данные по умолчанию
    $defaultData = [
        'users.json' => $preserveUsers ? $users : [
            [
                "name" => "admin",
                "password" => "admin123",
                "role" => "admin",
                "company" => "all"
            ]
        ],
        'companies.json' => ["CryoCo", "ThermalTech", "FrostIndustries"],
        'gases.json' => ["Nitrogen" => "0.808", "Oxygen" => "1.141", "Helium" => "0.164"],
        'ssid.json' => ["CryoWiFi" => "cryo123"]
    ];
    
    // Обновляем основные файлы настроек
    foreach ($defaultData as $file => $data) {
        $filePath = __DIR__ . '/data/' . $file;
        file_put_contents($filePath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        
        // Создаем INI версию для обратной совместимости
        $iniFile = str_replace('.json', '.ini', $filePath);
        file_put_contents($iniFile, json_encode($data, JSON_UNESCAPED_UNICODE));
    }
    
    logMessage("Система сброшена к настройкам по умолчанию");
    return true;
}

/**
 * Конвертирует старые данные в новый формат
 * @return array Результат конверсии
 */
function convertLegacyData() {
    $result = [
        'status' => 'success',
        'message' => 'Конвертация завершена успешно',
        'details' => []
    ];
    
    // Конвертируем основные файлы
    $conversions = [
        'users' => './data/usrs.ini',
        'companies' => './data/companies.ini',
        'gases' => './data/gases.ini',
        'ssid' => './data/ssid.ini'
    ];
    
    foreach ($conversions as $type => $iniFile) {
        if (file_exists($iniFile)) {
            $content = file_get_contents($iniFile);
            $data = json_decode($content, true);
            
            if ($data !== null) {
                // Конвертируем пользователей из старого формата
                if ($type === 'users') {
                    $newFormat = [];
                    foreach ($data as $username => $userId) {
                        $newFormat[] = [
                            'name' => $username,
                            'password' => $username === 'admin' ? 
                                (file_exists('./data/pssw.ini') ? file_get_contents('./data/pssw.ini') : 'admin123') : 
                                generatePassword(),
                            'role' => $username === 'admin' ? 'admin' : 'user',
                            'company' => 'all'
                        ];
                    }
                    $data = $newFormat;
                }
                
                // Сохраняем в новый формат
                $jsonFile = str_replace('.ini', '.json', $iniFile);
                file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                
                $result['details'][] = "Конвертирован файл $type";
            } else {
                $result['details'][] = "Ошибка декодирования файла $type";
                $result['status'] = 'warning';
            }
        } else {
            $result['details'][] = "Файл $type не найден";
        }
    }
    
    // Конвертируем данные цилиндров
    if (is_dir('./data/cc')) {
        $cylinders = array_diff(scandir('./data/cc'), ['.', '..']);
        
        foreach ($cylinders as $cylinder) {
            $ccPath = './data/cc/' . $cylinder;
            
            if (is_dir($ccPath)) {
                // Конвертируем файл настроек
                $setFile = $ccPath . '/set.ini';
                if (file_exists($setFile)) {
                    $content = file_get_contents($setFile);
                    $data = json_decode($content, true);
                    
                    if ($data !== null) {
                        file_put_contents($ccPath . '/set.json', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                        $result['details'][] = "Конвертированы настройки цилиндра $cylinder";
                    } else {
                        $result['details'][] = "Ошибка декодирования настроек цилиндра $cylinder";
                        $result['status'] = 'warning';
                    }
                }
                
                // Конвертируем файл истории
                $histFile = $ccPath . '/hist.ini';
                if (file_exists($histFile)) {
                    $content = file_get_contents($histFile);
                    $lines = explode("\n", $content);
                    $history = [];
                    
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (!empty($line)) {
                            $parts = explode(",", $line);
                            if (count($parts) >= 3) {
                                $history[] = [
                                    "timestamp" => $parts[0],
                                    "lADC" => $parts[1],
                                    "pADC" => $parts[2],
                                    "ubt" => isset($parts[3]) ? $parts[3] : null
                                ];
                            }
                        }
                    }
                    
                    file_put_contents($ccPath . '/hist.json', json_encode($history, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                    $result['details'][] = "Конвертирована история цилиндра $cylinder";
                }
                
                // Конвертируем файл калибровки
                $calibrFile = $ccPath . '/calibr.ini';
                if (file_exists($calibrFile)) {
                    $content = file_get_contents($calibrFile);
                    $data = json_decode($content, true);
                    
                    if ($data !== null) {
                        file_put_contents($ccPath . '/calibr.json', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                        $result['details'][] = "Конвертирована калибровка цилиндра $cylinder";
                    } else {
                        // Проверяем на INI формат
                        if (strpos($content, '[') !== false) {
                            $calibrData = [];
                            // Примитивный парсинг INI
                            $sections = parse_ini_string($content, true);
                            if ($sections) {
                                $calibrData[] = [
                                    'timestamp' => date('Y-m-d H:i:s'),
                                    'l0' => $sections['lvl']['l0'] ?? 0,
                                    'l1' => $sections['lvl']['l1'] ?? 0,
                                    'vol' => $sections['lvl']['vol'] ?? 0
                                ];
                                
                                file_put_contents($ccPath . '/calibr.json', json_encode($calibrData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                                $result['details'][] = "Конвертирована калибровка цилиндра $cylinder (INI формат)";
                            } else {
                                $result['details'][] = "Ошибка декодирования калибровки цилиндра $cylinder";
                                $result['status'] = 'warning';
                            }
                        } else {
                            $result['details'][] = "Ошибка декодирования калибровки цилиндра $cylinder";
                            $result['status'] = 'warning';
                        }
                    }
                }
            }
        }
    }
    
    logMessage("Конвертация данных: " . $result['status'] . " - " . $result['message']);
    return $result;
}

/**
 * Генерирует случайный пароль
 * @param int $length Длина пароля
 * @return string Случайный пароль
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
 * Экспортирует данные о цилиндре в CSV формат
 * @param string $cylinderId ID цилиндра
 * @return string|false Путь к созданному файлу или false в случае ошибки
 */
function exportCylinderData($cylinderId) {
    $cylinderPath = './data/cc/' . $cylinderId;
    
    if (!is_dir($cylinderPath)) {
        return false;
    }
    
    // Загружаем данные цилиндра
    $cylinderData = loadData($cylinderPath . '/set');
    
    // Загружаем историю
    $history = loadData($cylinderPath . '/hist', []);
    
    // Создаем директорию для экспорта если она не существует
    $exportDir = './data/export';
    if (!is_dir($exportDir)) {
        mkdir($exportDir, 0755, true);
    }
    
    $exportFile = $exportDir . '/' . $cylinderId . '_' . date('Y-m-d_H-i-s') . '.csv';
    
    // Формируем CSV
    $csv = "Timestamp,Level ADC,Level,Pressure ADC,Pressure,Battery\n";
    
    foreach ($history as $entry) {
        $level = isset($cylinderData['mLvl']) && isset($cylinderData['dLvl']) ? 
            round($entry['lADC'] * $cylinderData['mLvl'] + $cylinderData['dLvl'], 2) : '-';
        
        $pressure = (isset($cylinderData['prssOn']) && $cylinderData['prssOn'] == 1 && 
                    isset($cylinderData['mPrss']) && isset($cylinderData['dPrss'])) ? 
            round($entry['pADC'] * $cylinderData['mPrss'] + $cylinderData['dPrss'], 2) : '-';
        
        $csv .= sprintf(
            "%s,%s,%s,%s,%s,%s\n",
            $entry['timestamp'],
            $entry['lADC'],
            $level,
            $entry['pADC'] ?? '-',
            $pressure,
            $entry['ubt'] ?? '-'
        );
    }
    
    if (file_put_contents($exportFile, $csv)) {
        logMessage("Экспорт данных цилиндра $cylinderId в файл $exportFile");
        return $exportFile;
    }
    
    return false;
}

/**
 * Возвращает текущее значение АЦП для цилиндра (для калибровки)
 * @param string $cylinderId ID цилиндра
 * @return array Данные АЦП или null в случае ошибки
 */
function getCurrentADC($cylinderId) {
    $cylinderPath = './data/cc/' . $cylinderId;
    
    if (!is_dir($cylinderPath)) {
        return null;
    }
    
    // Загружаем данные цилиндра
    $cylinderData = loadData($cylinderPath . '/set');
    
    if (!isset($cylinderData['lADC'])) {
        return null;
    }
    
    return [
        'lADC' => $cylinderData['lADC'],
        'pADC' => $cylinderData['pADC'] ?? null,
        'lstTm' => $cylinderData['lstTm'] ?? null
    ];
}