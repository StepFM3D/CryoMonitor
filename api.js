/**
 * api.js - Fixed API communication module
 */

// Объект для работы с API
const API = {
    /**
     * Базовая функция для выполнения HTTP запросов
     * @param {string} url URL запроса
     * @param {string} method HTTP метод (GET, POST, DELETE и т.д.)
     * @param {object} data Данные для отправки (для POST запросов)
     * @return {Promise} Промис с результатом запроса
     */
    request: function(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Accept': 'application/json'
            }
        };
        
        if (data && method !== 'GET') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        
        return fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error('API request error:', error);
                throw error;
            });
    },
    
    /**
     * Проверяет статус входа пользователя
     * @return {Promise} Промис с данными пользователя
     */
    checkLoginStatus: function() {
        return this.request('login.php');
    },
    
    /**
     * Выполняет вход пользователя
     * @param {string} username Имя пользователя
     * @param {string} password Пароль
     * @return {Promise} Промис с результатом входа
     */
    login: function(username, password) {
        return this.request('login.php', 'POST', {
            login: username,
            password: password
        });
    },
    
    /**
     * Выполняет выход пользователя
     * @return {Promise} Промис с результатом выхода
     */
    logout: function() {
        return this.request('login.php?logout=1');
    },
    
    /**
     * Получает список цилиндров
     * @return {Promise} Промис со списком цилиндров
     */
    getCylinders: function() {
        return this.request('api.php?action=cylinders');
    },
    
    /**
     * Получает данные конкретного цилиндра
     * @param {string} cylinderId ID цилиндра
     * @param {boolean} includeHistory Включать ли историю
     * @return {Promise} Промис с данными цилиндра
     */
    getCylinderDetails: function(cylinderId, includeHistory = true) {
        return this.request(`api.php?action=cylinder&id=${cylinderId}&history=${includeHistory}`);
    },
    
    /**
     * Создает новый цилиндр
     * @param {Object} cylinderData Данные цилиндра
     * @return {Promise} Промис с результатом создания
     */
    createCylinder: function(cylinderData) {
        return this.request('api.php?action=create', 'POST', cylinderData);
    },
    
    /**
     * Обновляет данные цилиндра
     * @param {string} cylinderId ID цилиндра
     * @param {Object} cylinderData Данные цилиндра
     * @return {Promise} Промис с результатом обновления
     */
    updateCylinder: function(cylinderId, cylinderData) {
        return this.request(`api.php?action=update&id=${cylinderId}`, 'POST', cylinderData);
    },
    
    /**
     * Удаляет цилиндр
     * @param {string} cylinderId ID цилиндра
     * @return {Promise} Промис с результатом удаления
     */
    deleteCylinder: function(cylinderId) {
        return this.request(`api.php?action=delete&id=${cylinderId}`, 'DELETE');
    },
    
    /**
     * Выполняет калибровку цилиндра
     * @param {string} cylinderId ID цилиндра
     * @param {Object} calibrationData Данные калибровки
     * @return {Promise} Промис с результатом калибровки
     */
    calibrateCylinder: function(cylinderId, calibrationData) {
        return this.request(`api.php?action=calibrate&id=${cylinderId}`, 'POST', calibrationData);
    },
    
    /**
     * Получает настройки
     * @return {Promise} Промис с настройками
     */
    getSettings: function() {
        return this.request('api.php?action=settings');
    },
    
    /**
     * Получает пользователей
     * @return {Promise} Промис со списком пользователей
     */
    getUsers: function() {
        return this.request('api.php?action=settings&type=users');
    },
    
    /**
     * Создает или обновляет пользователя
     * @param {Object} userData Данные пользователя
     * @return {Promise} Промис с результатом операции
     */
    saveUser: function(userData) {
        return this.request('api.php?action=settings&type=users', 'POST', userData);
    },
    
    /**
     * Удаляет пользователя
     * @param {string} username Имя пользователя
     * @return {Promise} Промис с результатом удаления
     */
    deleteUser: function(username) {
        return this.request('api.php?action=settings&type=users', 'POST', {
            remove: true,
            name: username
        });
    },
    
    /**
     * Сохраняет компанию
     * @param {Object} companyData Данные компании
     * @return {Promise} Промис с результатом операции
     */
    saveCompany: function(companyData) {
        return this.request('api.php?action=settings&type=companies', 'POST', companyData);
    },
    
    /**
     * Удаляет компанию
     * @param {string} company Название компании
     * @return {Promise} Промис с результатом удаления
     */
    deleteCompany: function(company) {
        return this.request('api.php?action=settings&type=companies', 'POST', {
            remove: true,
            name: company
        });
    },
    
    /**
     * Сохраняет газ
     * @param {Object} gasData Данные газа
     * @return {Promise} Промис с результатом операции
     */
    saveGas: function(gasData) {
        return this.request('api.php?action=settings&type=gases', 'POST', gasData);
    },
    
    /**
     * Удаляет газ
     * @param {string} gasName Название газа
     * @return {Promise} Промис с результатом удаления
     */
    deleteGas: function(gasName) {
        return this.request('api.php?action=settings&type=gases', 'POST', {
            remove: true,
            name: gasName
        });
    },
    
    /**
     * Сохраняет WiFi сеть
     * @param {Object} wifiData Данные WiFi
     * @return {Promise} Промис с результатом операции
     */
    saveWifi: function(wifiData) {
        return this.request('api.php?action=settings&type=wifi', 'POST', wifiData);
    },
    
    /**
     * Удаляет WiFi сеть
     * @param {string} ssid SSID сети
     * @return {Promise} Промис с результатом удаления
     */
    deleteWifi: function(ssid) {
        return this.request('api.php?action=settings&type=wifi', 'POST', {
            remove: true,
            ssid: ssid
        });
    },
    
    /**
     * Проверяет структуру файлов
     * @return {Promise} Промис с результатом проверки
     */
    checkFiles: function() {
        return this.request('api.php?action=check_files');
    },
    
    /**
     * Сбрасывает систему к настройкам по умолчанию
     * @return {Promise} Промис с результатом сброса
     */
    resetSystem: function() {
        return this.request('api.php?action=reset', 'POST');
    }
};

// Экспортируем объект API
window.API = API;