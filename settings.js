/**
 * settings.js - Логика для настроек системы
 */

// Объект для работы с настройками
const Settings = {
    /**
     * Загружает и отображает пользователей
     */
    loadUsers: function() {
        if (App.state.user.role !== 'admin') return;
        
        Utils.showLoading();
        
        API.getUsers()
            .then(data => {
                if (data.status === 'success') {
                    App.state.users = data.data.users || [];
                    this.updateUsersTable();
                } else {
                    Utils.showError(data.message || 'Не удалось загрузить пользователей');
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки пользователей:', error);
                Utils.showError('Не удалось загрузить пользователей');
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },
    
    /**
     * Обновляет таблицу пользователей
     */
    updateUsersTable: function() {
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = '';
        
        App.state.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.role === 'admin' ? 'Администратор' : 'Пользователь'}</td>
                <td>${user.company === 'all' ? 'Все компании' : user.company}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-user" data-username="${user.name}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-user" data-username="${user.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            usersTable.appendChild(row);
        });
        
        // Добавить обработчики событий для кнопок редактирования/удаления
        this.addUserButtonHandlers();
    },
    
    /**
     * Добавляет обработчики событий для кнопок пользователей
     */
    addUserButtonHandlers: function() {
        document.querySelectorAll('.edit-user').forEach(button => {
            button.addEventListener('click', () => {
                const username = button.getAttribute('data-username');
                this.editUser(username);
            });
        });
        
        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', () => {
                const username = button.getAttribute('data-username');
                this.deleteUser(username);
            });
        });
    },
    
    /**
     * Редактирует пользователя
     * @param {string} username Имя пользователя
     */
    editUser: function(username) {
        const user = App.state.users.find(u => u.name === username);
        
        if (user) {
            document.getElementById('userId').value = user.name;
            document.getElementById('userName').value = user.name;
            document.getElementById('userPassword').value = '';  // Не показывать пароль
            document.getElementById('userRole').value = user.role;
            document.getElementById('userCompany').value = user.company;
            
            document.getElementById('userModalTitle').textContent = 'Редактировать пользователя';
            UI.modals.user.show();
        }
    },
    
    /**
     * Инициирует удаление пользователя
     * @param {string} username Имя пользователя
     */
    deleteUser: function(username) {
        // Не позволять удалять самого себя
        if (username === App.state.user.name) {
            Utils.showError('Вы не можете удалить свою учетную запись.');
            return;
        }
        
        // Показать подтверждение
        UI.showConfirmation(
            'Удаление пользователя',
            `Вы уверены, что хотите удалить пользователя "${username}"? Это действие нельзя отменить.`,
            () => {
                Utils.showLoading();
                
                API.deleteUser(username)
                    .then(data => {
                        if (data.status === 'success') {
                            UI.modals.confirmation.hide();
                            App.state.users = data.data;
                            this.updateUsersTable();
                        } else {
                            Utils.showError(data.message || 'Не удалось удалить пользователя');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка удаления пользователя:', error);
                        Utils.showError('Не удалось удалить пользователя');
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            }
        );
    },
    
    /**
     * Обновляет таблицу компаний
     */
    updateCompaniesTable: function() {
        const companiesTable = document.getElementById('companiesTable');
        companiesTable.innerHTML = '';
        
        App.state.companies.forEach(company => {
            // Подсчет цилиндров для этой компании
            const cylinderCount = App.state.cylinders.filter(c => c.company === company).length;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${company}</td>
                <td>${cylinderCount}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-company" data-company="${company}" ${cylinderCount > 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            companiesTable.appendChild(row);
        });
        
        // Добавить обработчики событий для кнопок удаления
        this.addCompanyButtonHandlers();
    },
    
    /**
     * Добавляет обработчики событий для кнопок компаний
     */
    addCompanyButtonHandlers: function() {
        document.querySelectorAll('.delete-company').forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) return;
                
                const company = button.getAttribute('data-company');
                this.deleteCompany(company);
            });
        });
    },
    
    /**
     * Инициирует удаление компании
     * @param {string} company Название компании
     */
    deleteCompany: function(company) {
        const cylinderCount = App.state.cylinders.filter(c => c.company === company).length;
        
        if (cylinderCount > 0) {
            Utils.showError(`Нельзя удалить компанию "${company}", так как к ней привязано ${cylinderCount} цилиндров.`);
            return;
        }
        
        // Показать подтверждение
        UI.showConfirmation(
            'Удаление компании',
            `Вы уверены, что хотите удалить компанию "${company}"? Это действие нельзя отменить.`,
            () => {
                Utils.showLoading();
                
                API.deleteCompany(company)
                    .then(data => {
                        if (data.status === 'success') {
                            UI.modals.confirmation.hide();
                            App.state.companies = data.data;
                            this.updateCompaniesTable();
                            UI.updateCompanyOptions(App.state.companies);
                        } else {
                            Utils.showError(data.message || 'Не удалось удалить компанию');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка удаления компании:', error);
                        Utils.showError('Не удалось удалить компанию');
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            }
        );
    },
    
    /**
     * Обновляет таблицу газов
     */
    updateGasesTable: function() {
        const gasesTable = document.getElementById('gasesTable');
        gasesTable.innerHTML = '';
        
        for (const [gasName, gasDensity] of Object.entries(App.state.gases)) {
            // Подсчет цилиндров, использующих этот газ
            const cylinderCount = App.state.cylinders.filter(c => c.gas === gasName).length;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${gasName}</td>
                <td>${gasDensity}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-gas" data-gas="${gasName}" ${cylinderCount > 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            gasesTable.appendChild(row);
        }
        
        // Добавить обработчики событий для кнопок удаления
        this.addGasButtonHandlers();
    },
    
    /**
     * Добавляет обработчики событий для кнопок газов
     */
    addGasButtonHandlers: function() {
        document.querySelectorAll('.delete-gas').forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) return;
                
                const gasName = button.getAttribute('data-gas');
                this.deleteGas(gasName);
            });
        });
    },
    
    /**
     * Инициирует удаление газа
     * @param {string} gasName Название газа
     */
    deleteGas: function(gasName) {
        // Показать подтверждение
        UI.showConfirmation(
            'Удаление газа',
            `Вы уверены, что хотите удалить газ "${gasName}"? Это действие нельзя отменить.`,
            () => {
                Utils.showLoading();
                
                API.deleteGas(gasName)
                    .then(data => {
                        if (data.status === 'success') {
                            UI.modals.confirmation.hide();
                            App.state.gases = data.data;
                            this.updateGasesTable();
                            UI.updateGasOptions(App.state.gases);
                        } else {
                            Utils.showError(data.message || 'Не удалось удалить газ');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка удаления газа:', error);
                        Utils.showError('Не удалось удалить газ');
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            }
        );
    },
    
    /**
     * Обновляет таблицу WiFi сетей
     */
    updateWifiTable: function() {
        const wifiTable = document.getElementById('wifiTable');
        wifiTable.innerHTML = '';
        
        for (const [ssid, password] of Object.entries(App.state.wifiNetworks)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ssid}</td>
                <td>${'•'.repeat(password.length)}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-wifi" data-ssid="${ssid}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            wifiTable.appendChild(row);
        }
        
        // Добавить обработчики событий для кнопок удаления
        this.addWifiButtonHandlers();
    },
    
    /**
     * Добавляет обработчики событий для кнопок WiFi
     */
    addWifiButtonHandlers: function() {
        document.querySelectorAll('.delete-wifi').forEach(button => {
            button.addEventListener('click', () => {
                const ssid = button.getAttribute('data-ssid');
                this.deleteWifi(ssid);
            });
        });
    },
    
    /**
     * Инициирует удаление WiFi сети
     * @param {string} ssid SSID сети
     */
    deleteWifi: function(ssid) {
        // Показать подтверждение
        UI.showConfirmation(
            'Удаление WiFi сети',
            `Вы уверены, что хотите удалить WiFi сеть "${ssid}"? Это действие нельзя отменить.`,
            () => {
                Utils.showLoading();
                
                API.deleteWifi(ssid)
                    .then(data => {
                        if (data.status === 'success') {
                            UI.modals.confirmation.hide();
                            App.state.wifiNetworks = data.data;
                            this.updateWifiTable();
                        } else {
                            Utils.showError(data.message || 'Не удалось удалить WiFi сеть');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка удаления WiFi сети:', error);
                        Utils.showError('Не удалось удалить WiFi сеть');
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            }
        );
    },
    
    /**
     * Проверяет структуру файлов
     */
    checkFiles: function() {
        Utils.showLoading();
        
        API.checkFiles()
            .then(data => {
                if (data.status === 'success') {
                    Utils.showError(`Проверка файлов завершена: ${data.message}`);
                } else {
                    Utils.showError(data.message || 'Ошибка при проверке файлов');
                }
            })
            .catch(error => {
                console.error('Ошибка проверки файлов:', error);
                Utils.showError('Не удалось выполнить проверку файлов');
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },
    
    /**
     * Инициирует сброс системы
     */
    resetSystem: function() {
        // Показать подтверждение
        UI.showConfirmation(
            'Сброс системы',
            'Вы уверены, что хотите сбросить систему к настройкам по умолчанию? Все данные будут потеряны. Это действие нельзя отменить.',
            () => {
                Utils.showLoading();
                
                API.resetSystem()
                    .then(data => {
                        if (data.status === 'success') {
                            UI.modals.confirmation.hide();
                            Utils.showError('Система сброшена к настройкам по умолчанию. Страница будет перезагружена.');
                            setTimeout(() => {
                                window.location.reload();
                            }, 3000);
                        } else {
                            Utils.showError(data.message || 'Не удалось сбросить систему');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка сброса системы:', error);
                        Utils.showError('Не удалось сбросить систему');
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            }
        );
    }
};

// Экспортируем объект Settings
window.Settings = Settings;