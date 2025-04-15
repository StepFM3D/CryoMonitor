/**
 * CryoCylinder Monitoring System - main.js
 * Основной JavaScript файл для веб-интерфейса системы мониторинга криоцилиндров
 */

// Запуск при полной загрузке DOM
document.addEventListener('DOMContentLoaded', function () {
    // Глобальный объект состояния приложения
    const state = {
        user: null,
        cylinders: [],
        users: [],
        companies: [],
        gases: {},
        wifiNetworks: {},
        selectedCylinder: null,
        chart: null,
        confirmCallback: null
    };

    // Инициализация Bootstrap модальных окон
    const modals = {
        cylinder: new bootstrap.Modal(document.getElementById('cylinderModal')),
        user: new bootstrap.Modal(document.getElementById('userModal')),
        company: new bootstrap.Modal(document.getElementById('companyModal')),
        gas: new bootstrap.Modal(document.getElementById('gasModal')),
        wifi: new bootstrap.Modal(document.getElementById('wifiModal')),
        calibration: new bootstrap.Modal(document.getElementById('calibrationModal')),
        confirmation: new bootstrap.Modal(document.getElementById('confirmationModal'))
    };

    // Инициализация приложения
    function initializeApp() {
        // Проверка статуса пользователя (залогинен или нет)
        checkLoginStatus();

        // Настройка обработчиков событий
        setupEventListeners();
    }

    // Проверка статуса входа пользователя
    function checkLoginStatus() {
        showLoading();

        fetch('login.php')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.user) {
                    // Пользователь залогинен
                    state.user = data.user;
                    showApp();
                    loadInitialData();
                } else {
                    // Пользователь не залогинен
                    showLogin();
                }
            })
            .catch(error => {
                console.error('Ошибка проверки статуса входа:', error);
                showLogin();
            })
            .finally(() => {
                hideLoading();
            });
    }

    // Показать страницу входа
    function showLogin() {
        document.getElementById('appView').classList.add('d-none');
        document.getElementById('loginView').classList.remove('d-none');
    }

    // Показать основное приложение
    function showApp() {
        document.getElementById('loginView').classList.add('d-none');
        document.getElementById('appView').classList.remove('d-none');

        // Обновить информацию о пользователе
        document.getElementById('currentUserName').textContent = state.user.name;
        document.getElementById('dashboardUserName').textContent = state.user.name;

        // Скрыть/показать элементы для администратора
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            if (state.user.role === 'admin') {
                el.classList.remove('d-none');
            } else {
                el.classList.add('d-none');
            }
        });

        // По умолчанию показать панель управления
        showView('dashboard');
    }

    // Загрузка начальных данных
    function loadInitialData() {
        showLoading();

        // Загружаем данные о цилиндрах
        fetch('api.php?action=cylinders')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    state.cylinders = data.data;
                    updateDashboard();
                    updateCylindersList();
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки данных о цилиндрах:', error);
                showError('Не удалось загрузить данные о цилиндрах.');
            });

        // Загружаем настройки (компании, газы и т.д.)
        fetch('api.php?action=settings')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    state.companies = data.data.companies || [];
                    state.gases = data.data.gases || {};
                    state.wifiNetworks = data.data.wifiNetworks || {};

                    // Обновляем выпадающие списки
                    updateCompanyOptions();
                    updateGasOptions();

                    // Для администратора обновляем таблицы настроек
                    if (state.user.role === 'admin') {
                        updateCompaniesTable();
                        updateGasesTable();
                        updateWifiTable();

                        // Загружаем пользователей
                        loadUsers();
                    }
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки настроек:', error);
                showError('Не удалось загрузить настройки.');
            })
            .finally(() => {
                hideLoading();
            });
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        // Форма входа
        document.getElementById('loginForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            showLoading();

            fetch('login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    login: username,
                    password: password
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        state.user = data.user;
                        showApp();
                        loadInitialData();
                    } else {
                        document.getElementById('loginError').textContent = data.message || 'Ошибка входа';
                        document.getElementById('loginError').classList.remove('d-none');
                    }
                })
                .catch(error => {
                    console.error('Ошибка входа:', error);
                    document.getElementById('loginError').textContent = 'Произошла ошибка при входе';
                    document.getElementById('loginError').classList.remove('d-none');
                })
                .finally(() => {
                    hideLoading();
                });
        });

        // Кнопка выхода
        document.getElementById('btnLogout').addEventListener('click', function (e) {
            e.preventDefault();

            showLoading();

            fetch('login.php?logout=1')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        state.user = null;
                        showLogin();
                    }
                })
                .catch(error => {
                    console.error('Ошибка выхода:', error);
                    showError('Не удалось выйти. Пожалуйста, попробуйте снова.');
                })
                .finally(() => {
                    hideLoading();
                });
        });

        // Навигация по боковой панели
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', function () {
                const view = this.getAttribute('data-view');
                showView(view);
            });
        });

        // Переключатель боковой панели для мобильных устройств
        document.getElementById('sidebarToggle').addEventListener('click', function () {
            document.getElementById('sidebar').classList.toggle('show');
        });

        // Кнопка обновления на панели управления
        document.getElementById('refreshDashboard').addEventListener('click', function () {
            refreshData();
        });

        // Кнопка обновления списка цилиндров
        document.getElementById('refreshCylinders').addEventListener('click', function () {
            refreshData();
        });

        // Кнопка добавления цилиндра
        document.getElementById('addCylinder').addEventListener('click', function () {
            // Сбросить форму
            document.getElementById('cylinderForm').reset();
            document.getElementById('cylinderId').value = '';
            document.getElementById('cylinderModalTitle').textContent = 'Добавить цилиндр';
        
            // Показать модальное окно - проверяем доступность modals
            if (window.modals && modals.cylinder) {
                // Используем глобальный объект modals
                modals.cylinder.show();
            } else if (window.UI && UI.modals && UI.modals.cylinder) {
                // Используем модальные окна из UI
                UI.modals.cylinder.show();
            } else {
                // Запасной вариант - создать модальное окно через bootstrap
                console.warn('Объект модальных окон недоступен, используем запасной вариант');
                const cylinderModal = document.getElementById('cylinderModal');
                if (cylinderModal && typeof bootstrap !== 'undefined') {
                    try {
                        const modal = new bootstrap.Modal(cylinderModal);
                        modal.show();
                    } catch (e) {
                        console.error('Ошибка при создании модального окна:', e);
                        alert('Ошибка при отображении формы. Пожалуйста, проверьте консоль для деталей.');
                    }
                } else {
                    alert('Невозможно отобразить форму добавления цилиндра. Bootstrap не инициализирован.');
                }
            }
        });

        // Кнопка сохранения цилиндра
        document.getElementById('saveCylinder').addEventListener('click', function () {
            const form = document.getElementById('cylinderForm');
        
            if (form.checkValidity()) {
                const cylinderId = document.getElementById('cylinderId').value;
                const isEdit = cylinderId !== '';
        
                const cylinderData = {
                    name: document.getElementById('cylinderName').value,
                    company: document.getElementById('cylinderCompany').value,
                    gas: document.getElementById('cylinderGas').value,
                    vol: document.getElementById('cylinderVolume').value,
                    vh: document.getElementById('cylinderOrientation').value,
                    prssOn: document.getElementById('cylinderPressure').value,
                    mUnit: document.getElementById('cylinderUnit').value,
                    sleep: document.getElementById('cylinderInterval').value
                };
        
                // Проверяем наличие функции showLoading
                if (typeof showLoading === 'function') {
                    showLoading();
                } else if (window.Utils && typeof Utils.showLoading === 'function') {
                    Utils.showLoading();
                }
        
                const url = isEdit
                    ? `api.php?action=update&id=${cylinderId}`
                    : 'api.php?action=create';
        
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(cylinderData)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            // Закрываем модальное окно, проверяя наличие объекта
                            if (window.modals && modals.cylinder) {
                                modals.cylinder.hide();
                            } else if (window.UI && UI.modals && UI.modals.cylinder) {
                                UI.modals.cylinder.hide();
                            } else {
                                const cylinderModal = document.getElementById('cylinderModal');
                                if (cylinderModal && typeof bootstrap !== 'undefined') {
                                    const instance = bootstrap.Modal.getInstance(cylinderModal);
                                    if (instance) instance.hide();
                                }
                            }
                            
                            // Обновляем данные
                            if (typeof refreshData === 'function') {
                                refreshData();
                            } else if (window.App && typeof App.refreshData === 'function') {
                                App.refreshData();
                            }
                        } else {
                            // Показываем ошибку
                            if (typeof showError === 'function') {
                                showError(data.message || 'Не удалось сохранить цилиндр');
                            } else if (window.Utils && typeof Utils.showError === 'function') {
                                Utils.showError(data.message || 'Не удалось сохранить цилиндр');
                            } else {
                                alert(data.message || 'Не удалось сохранить цилиндр');
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сохранения цилиндра:', error);
                        
                        // Показываем ошибку
                        if (typeof showError === 'function') {
                            showError('Не удалось сохранить цилиндр');
                        } else if (window.Utils && typeof Utils.showError === 'function') {
                            Utils.showError('Не удалось сохранить цилиндр');
                        } else {
                            alert('Не удалось сохранить цилиндр');
                        }
                    })
                    .finally(() => {
                        // Скрываем индикатор загрузки
                        if (typeof hideLoading === 'function') {
                            hideLoading();
                        } else if (window.Utils && typeof Utils.hideLoading === 'function') {
                            Utils.hideLoading();
                        }
                    });
            } else {
                form.reportValidity();
            }
        });

        // Кнопка возврата к списку цилиндров
        document.getElementById('backToCylinders').addEventListener('click', function () {
            showView('cylinders');
        });

        // Кнопка обновления данных цилиндра
        document.getElementById('refreshCylinderDetail').addEventListener('click', function () {
            if (state.selectedCylinder) {
                loadCylinderDetails(state.selectedCylinder.name);
            }
        });

        // Кнопка редактирования цилиндра
        document.getElementById('editCylinder').addEventListener('click', function () {
            if (!state.selectedCylinder) return;

            // Заполнить форму данными текущего цилиндра
            document.getElementById('cylinderId').value = state.selectedCylinder.name;
            document.getElementById('cylinderName').value = state.selectedCylinder.name;
            document.getElementById('cylinderCompany').value = state.selectedCylinder.company || '';
            document.getElementById('cylinderGas').value = state.selectedCylinder.gas || '';
            document.getElementById('cylinderVolume').value = state.selectedCylinder.vol || '';
            document.getElementById('cylinderOrientation').value = state.selectedCylinder.vh || 'vert';
            document.getElementById('cylinderPressure').value = state.selectedCylinder.prssOn || '0';
            document.getElementById('cylinderUnit').value = state.selectedCylinder.mUnit || 'L';
            document.getElementById('cylinderInterval').value = state.selectedCylinder.sleep || '1';

            document.getElementById('cylinderModalTitle').textContent = 'Редактировать цилиндр';

            // Показать модальное окно
            modals.cylinder.show();
        });

        // Кнопка добавления пользователя
        document.getElementById('addUser').addEventListener('click', function () {
            // Сбросить форму
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            document.getElementById('userModalTitle').textContent = 'Добавить пользователя';

            // Показать модальное окно
            modals.user.show();
        });

        // Кнопка сохранения пользователя
        document.getElementById('saveUser').addEventListener('click', function () {
            const form = document.getElementById('userForm');

            if (form.checkValidity()) {
                const userData = {
                    add: true,
                    name: document.getElementById('userName').value,
                    password: document.getElementById('userPassword').value,
                    role: document.getElementById('userRole').value,
                    company: document.getElementById('userCompany').value
                };

                showLoading();

                fetch('api.php?action=settings&type=users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            modals.user.hide();
                            loadUsers();
                        } else {
                            showError(data.message || 'Не удалось сохранить пользователя');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сохранения пользователя:', error);
                        showError('Не удалось сохранить пользователя');
                    })
                    .finally(() => {
                        hideLoading();
                    });
            } else {
                form.reportValidity();
            }
        });

        // Кнопка добавления компании
        document.getElementById('addCompany').addEventListener('click', function () {
            // Сбросить форму
            document.getElementById('companyForm').reset();

            // Показать модальное окно
            modals.company.show();
        });

        // Кнопка сохранения компании
        document.getElementById('saveCompany').addEventListener('click', function () {
            const form = document.getElementById('companyForm');

            if (form.checkValidity()) {
                const companyData = {
                    add: true,
                    name: document.getElementById('companyName').value
                };

                showLoading();

                fetch('api.php?action=settings&type=companies', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(companyData)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            modals.company.hide();
                            state.companies = data.data;
                            updateCompaniesTable();
                            updateCompanyOptions();
                        } else {
                            showError(data.message || 'Не удалось сохранить компанию');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сохранения компании:', error);
                        showError('Не удалось сохранить компанию');
                    })
                    .finally(() => {
                        hideLoading();
                    });
            } else {
                form.reportValidity();
            }
        });

        // Кнопка добавления газа
        document.getElementById('addGas').addEventListener('click', function () {
            // Сбросить форму
            document.getElementById('gasForm').reset();

            // Показать модальное окно
            modals.gas.show();
        });

        // Кнопка сохранения газа
        document.getElementById('saveGas').addEventListener('click', function () {
            const form = document.getElementById('gasForm');

            if (form.checkValidity()) {
                const gasData = {
                    add: true,
                    name: document.getElementById('gasName').value,
                    density: document.getElementById('gasDensity').value
                };

                showLoading();

                fetch('api.php?action=settings&type=gases', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(gasData)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            modals.gas.hide();
                            state.gases = data.data;
                            updateGasesTable();
                            updateGasOptions();
                        } else {
                            showError(data.message || 'Не удалось сохранить газ');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сохранения газа:', error);
                        showError('Не удалось сохранить газ');
                    })
                    .finally(() => {
                        hideLoading();
                    });
            } else {
                form.reportValidity();
            }
        });

        // Кнопка добавления WiFi сети
        document.getElementById('addWifi').addEventListener('click', function () {
            // Сбросить форму
            document.getElementById('wifiForm').reset();

            // Показать модальное окно
            modals.wifi.show();
        });

        // Кнопка сохранения WiFi сети
        document.getElementById('saveWifi').addEventListener('click', function () {
            const form = document.getElementById('wifiForm');

            if (form.checkValidity()) {
                const wifiData = {
                    add: true,
                    ssid: document.getElementById('wifiSSID').value,
                    password: document.getElementById('wifiPassword').value
                };

                showLoading();

                fetch('api.php?action=settings&type=wifi', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(wifiData)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            modals.wifi.hide();
                            state.wifiNetworks = data.data;
                            updateWifiTable();
                        } else {
                            showError(data.message || 'Не удалось сохранить WiFi сеть');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сохранения WiFi сети:', error);
                        showError('Не удалось сохранить WiFi сеть');
                    })
                    .finally(() => {
                        hideLoading();
                    });
            } else {
                form.reportValidity();
            }
        });

        // Кнопка калибровки
        document.getElementById('calibrateButton').addEventListener('click', function () {
            if (!state.selectedCylinder) return;

            // Сбросить форму
            document.getElementById('calibrationForm').reset();
            document.getElementById('calibrationCylinderId').value = state.selectedCylinder.name;

            // Установить текущие значения АЦП
            document.getElementById('currentLevelADC').textContent = state.selectedCylinder.lADC || '-';
            document.getElementById('currentPressureADC').textContent = state.selectedCylinder.pADC || '-';

            // Показать/скрыть секцию калибровки давления
            const pressureSection = document.querySelector('.pressure-calibration-section');
            if (state.selectedCylinder.prssOn == 1) {
                pressureSection.classList.remove('d-none');
            } else {
                pressureSection.classList.add('d-none');
            }

            // Показать модальное окно
            modals.calibration.show();
        });

        // Кнопка сохранения калибровки
        document.getElementById('saveCalibration').addEventListener('click', function () {
            const form = document.getElementById('calibrationForm');

            if (form.checkValidity()) {
                const cylinderId = document.getElementById('calibrationCylinderId').value;

                const calibrationData = {
                    l0: document.getElementById('l0').value,
                    l1: document.getElementById('l1').value
                };

                // Добавить калибровку давления если включена
                if (state.selectedCylinder.prssOn == 1) {
                    calibrationData.p0 = document.getElementById('p0').value;
                    calibrationData.p1 = document.getElementById('p1').value;
                    calibrationData.prss1 = document.getElementById('prss1').value;
                }

                showLoading();

                fetch(`api.php?action=calibrate&id=${cylinderId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(calibrationData)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            modals.calibration.hide();
                            loadCylinderDetails(cylinderId);
                        } else {
                            showError(data.message || 'Не удалось сохранить калибровку');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сохранения калибровки:', error);
                        showError('Не удалось сохранить калибровку');
                    })
                    .finally(() => {
                        hideLoading();
                    });
            } else {
                form.reportValidity();
            }
        });

        // Кнопка удаления цилиндра
        document.getElementById('deleteCylinderButton').addEventListener('click', function () {
            if (!state.selectedCylinder) return;

            // Установить сообщение подтверждения и callback
            document.getElementById('confirmationTitle').textContent = 'Удаление цилиндра';
            document.getElementById('confirmationMessage').textContent =
                `Вы уверены, что хотите удалить цилиндр "${state.selectedCylinder.name}"? Это действие нельзя отменить.`;

            state.confirmCallback = function () {
                showLoading();

                fetch(`api.php?action=delete&id=${state.selectedCylinder.name}`, {
                    method: 'DELETE'
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            modals.confirmation.hide();
                            showView('cylinders');
                            refreshData();
                        } else {
                            showError(data.message || 'Не удалось удалить цилиндр');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка удаления цилиндра:', error);
                        showError('Не удалось удалить цилиндр');
                    })
                    .finally(() => {
                        hideLoading();
                    });
            };

            // Показать модальное окно подтверждения
            modals.confirmation.show();
        });

        // Кнопка подтверждения в модальном окне
        document.getElementById('confirmButton').addEventListener('click', function () {
            if (typeof state.confirmCallback === 'function') {
                state.confirmCallback();
            }
        });

        // Кнопки для просмотра истории
        document.getElementById('view24h').addEventListener('click', function () {
            updateHistoryChart('24h');
        });

        document.getElementById('view7d').addEventListener('click', function () {
            updateHistoryChart('7d');
        });

        document.getElementById('view30d').addEventListener('click', function () {
            updateHistoryChart('30d');
        });

        document.getElementById('viewAll').addEventListener('click', function () {
            updateHistoryChart('all');
        });

        // Кнопка для экспорта данных
        document.getElementById('exportDataButton').addEventListener('click', function () {
            if (!state.selectedCylinder) return;

            window.location.href = `api.php?action=export&id=${state.selectedCylinder.name}`;
        });

        // Кнопки проверки файлов, резервного копирования и сброса
        document.getElementById('checkFiles').addEventListener('click', function () {
            showLoading();

            fetch('api.php?action=check_files')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        showError(`Проверка файлов завершена: ${data.message}`);
                    } else {
                        showError(data.message || 'Ошибка при проверке файлов');
                    }
                })
                .catch(error => {
                    console.error('Ошибка проверки файлов:', error);
                    showError('Не удалось выполнить проверку файлов');
                })
                .finally(() => {
                    hideLoading();
                });
        });

        document.getElementById('backupSystem').addEventListener('click', function () {
            window.location.href = 'api.php?action=backup';
        });

        document.getElementById('resetSystem').addEventListener('click', function () {
            // Установить сообщение подтверждения и callback
            document.getElementById('confirmationTitle').textContent = 'Сброс системы';
            document.getElementById('confirmationMessage').textContent =
                'Вы уверены, что хотите сбросить систему к настройкам по умолчанию? Все данные будут потеряны. Это действие нельзя отменить.';

            state.confirmCallback = function () {
                showLoading();

                fetch('api.php?action=reset', {
                    method: 'POST'
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            modals.confirmation.hide();
                            showError('Система сброшена к настройкам по умолчанию. Страница будет перезагружена.');
                            setTimeout(() => {
                                window.location.reload();
                            }, 3000);
                        } else {
                            showError(data.message || 'Не удалось сбросить систему');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сброса системы:', error);
                        showError('Не удалось сбросить систему');
                    })
                    .finally(() => {
                        hideLoading();
                    });
            };

            // Показать модальное окно подтверждения
            modals.confirmation.show();
        });
    }

    // Функции для показа/скрытия представлений
    function showView(viewName) {
        // Скрыть все представления
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.add('d-none');
        });

        // Обновить активное состояние боковой панели
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });

        // Показать выбранное представление
        const viewElement = document.getElementById(`${viewName}View`);
        if (viewElement) {
            viewElement.classList.remove('d-none');

            // Установить активный элемент боковой панели
            const sidebarItem = document.querySelector(`.sidebar-item[data-view="${viewName}"]`);
            if (sidebarItem) {
                sidebarItem.classList.add('active');
            }

            // Скрыть боковую панель на мобильных
            if (window.innerWidth < 992) {
                document.getElementById('sidebar').classList.remove('show');
            }

            // Загрузить данные специфичные для представления
            if (viewName === 'users' && state.user.role === 'admin') {
                loadUsers();
            }
        }
    }

    // Функция для отображения загрузки
    function showLoading() {
        document.getElementById('loadingOverlay').classList.remove('d-none');
    }

    // Функция для скрытия загрузки
    function hideLoading() {
        document.getElementById('loadingOverlay').classList.add('d-none');
    }

    // Функция для отображения ошибки
    function showError(message) {
        alert(message); // Простой alert, можно заменить на более красивый тост или модальное окно
    }

    // Функция для обновления данных
    function refreshData() {
        showLoading();

        fetch('api.php?action=cylinders')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    state.cylinders = data.data;
                    updateDashboard();
                    updateCylindersList();

                    // Обновить детальное представление если открыто
                    if (!document.getElementById('cylinderDetailView').classList.contains('d-none') &&
                        state.selectedCylinder) {
                        loadCylinderDetails(state.selectedCylinder.name);
                    }
                }
            })
            .catch(error => {
                console.error('Ошибка обновления данных:', error);
                showError('Не удалось обновить данные.');
            })
            .finally(() => {
                hideLoading();
            });
    }

    // Инициализация приложения
    initializeApp();
});