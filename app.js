/**
 * app.js - Main application core with fixes
 */

// Основной объект приложения
const App = {
    // Глобальное состояние приложения
    state: {
        user: null,
        cylinders: [],
        users: [],
        companies: [],
        gases: {},
        wifiNetworks: {},
        selectedCylinder: null,
        chart: null,
        confirmCallback: null
    },

    /**
     * Инициализация приложения
     */
    init: function () {
        console.log('Initializing App module...');
        
        // Проверим, что все необходимые объекты загружены
        if (!window.UI || !window.API || !window.Utils) {
            console.error('Required dependencies not loaded. Cannot initialize App.');
            return;
        }
        
        // Проверка статуса входа
        this.checkLoginStatus();

        // Настройка обработчиков событий
        this.setupEventListeners();
        
        console.log('App module initialized successfully');
    },

    /**
     * Проверяет статус входа пользователя
     */
    checkLoginStatus: function () {
        Utils.showLoading();

        API.checkLoginStatus()
            .then(data => {
                if (data.status === 'success' && data.user) {
                    // Пользователь залогинен
                    this.userLoggedIn(data.user);
                } else {
                    // Пользователь не залогинен
                    UI.showLogin();
                }
            })
            .catch(error => {
                console.error('Ошибка проверки статуса входа:', error);
                UI.showLogin();
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },

    /**
     * Пользователь залогинен
     * @param {Object} user Данные пользователя
     */
    userLoggedIn: function (user) {
        this.state.user = user;
        UI.showApp(user);
        this.loadInitialData();
    },

    /**
     * Загружает начальные данные
     */
    loadInitialData: function () {
        Utils.showLoading();

        // Ensure Dashboard and Cylinders modules are available
        if (!window.Dashboard || !window.Cylinders) {
            console.error('Dashboard or Cylinders module not loaded.');
            Utils.showError('Не удалось загрузить необходимые модули приложения.');
            Utils.hideLoading();
            return;
        }

        API.getCylinders()
            .then(data => {
                if (data.status === 'success') {
                    App.state.cylinders = data.data;

                    // Используйте правильное имя метода
                    Dashboard.update(App.state.cylinders); // <-- ИСПРАВЛЕНО: App.state

                    Cylinders.updateList(App.state.cylinders); // <-- ИСПРАВЛЕНО: App.state
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки данных о цилиндрах:', error);
                Utils.showError('Не удалось загрузить данные о цилиндрах.');
            });;

        API.getSettings()
        .then(data => {
            if (data.status === 'success') {
                App.state.companies = data.data.companies || []; // <-- ИСПРАВЛЕНО: App.state
                App.state.gases = data.data.gases || {}; // <-- ИСПРАВЛЕНО: App.state
                App.state.wifiNetworks = data.data.wifiNetworks || {}; // <-- ИСПРАВЛЕНО: App.state
    
                // Используйте правильное имя метода
                UI.updateCompanyOptions(App.state.companies); // <-- ИСПРАВЛЕНО: App.state
                UI.updateGasOptions(App.state.gases); // <-- ИСПРАВЛЕНО: App.state
                
                // Другая логика
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки настроек:', error);
            Utils.showError('Не удалось загрузить настройки.');
        })
        .finally(() => {
            Utils.hideLoading();
        });
    },

    /**
     * Обновляет данные
     */
    refreshData: function () {
        Utils.showLoading();

        API.getCylinders()
            .then(data => {
                if (data.status === 'success') {
                    this.state.cylinders = data.data;
                    
                    if (typeof Dashboard.update === 'function') {
                        Dashboard.update(this.state.cylinders);
                    }
                    
                    if (typeof Cylinders.updateList === 'function') {
                        Cylinders.updateList(this.state.cylinders);
                    }

                    // Обновить детальное представление если открыто
                    if (this.state.selectedCylinder &&
                        document.getElementById('cylinderDetailView') &&
                        !document.getElementById('cylinderDetailView').classList.contains('d-none')) {
                        if (typeof Cylinders.loadDetails === 'function') {
                            Cylinders.loadDetails(this.state.selectedCylinder.name);
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Ошибка обновления данных:', error);
                Utils.showError('Не удалось обновить данные.');
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },

    /**
     * Настраивает обработчики событий
     */
    setupEventListeners: function () {
        console.log('Setting up App event listeners...');
        
        // Обработчик для ссылок на цилиндры
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('cylinder-link')) {
                e.preventDefault();
                const cylinderId = e.target.getAttribute('data-id');
                if (window.Cylinders && typeof Cylinders.loadDetails === 'function') {
                    Cylinders.loadDetails(cylinderId);
                }
            }
        });

        // Форма входа
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                Utils.showLoading();
                
                API.login(username, password)
                    .then(data => {
                        if (data.status === 'success') {
                            this.userLoggedIn(data.user);
                        } else {
                            const loginError = document.getElementById('loginError');
                            if (loginError) {
                                loginError.textContent = data.message || 'Ошибка входа';
                                loginError.classList.remove('d-none');
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка входа:', error);
                        const loginError = document.getElementById('loginError');
                        if (loginError) {
                            loginError.textContent = 'Произошла ошибка при входе';
                            loginError.classList.remove('d-none');
                        }
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            });
        }

        // Кнопка выхода
        const logoutBtn = document.getElementById('btnLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                Utils.showLoading();
                
                API.logout()
                    .then(data => {
                        if (data.status === 'success') {
                            this.state.user = null;
                            UI.showLogin();
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка выхода:', error);
                        Utils.showError('Не удалось выйти. Пожалуйста, попробуйте снова.');
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            });
        }

        // Кнопка обновления на панели управления
        const refreshDashboardBtn = document.getElementById('refreshDashboard');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Кнопка обновления списка цилиндров
        const refreshCylindersBtn = document.getElementById('refreshCylinders');
        if (refreshCylindersBtn) {
            refreshCylindersBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
        
        // Навигация по боковой панели
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', function() {
                const view = this.getAttribute('data-view');
                if (window.UI && typeof UI.showView === 'function') {
                    UI.showView(view);
                }
            });
        });

        // Auto-refresh - disabled for debugging, uncomment when ready
        /*
        setInterval(() => {
            if (this.state.user) {
                this.refreshData();
            }
        }, 60000); // 60 seconds
        */
        
        console.log('App event listeners set up successfully');
    }
};

// Экспортируем объект App
window.App = App;