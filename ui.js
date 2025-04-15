/**
 * ui.js - Функции для работы с интерфейсом
 */

// Объект для работы с интерфейсом
const UI = {
    // Инициализация Bootstrap модальных окон
    modals: {},
    
    /**
     * Инициализация интерфейса
     */
    init: function() {
        // Инициализация модальных окон
        this.modals = {
            cylinder: new bootstrap.Modal(document.getElementById('cylinderModal')),
            user: new bootstrap.Modal(document.getElementById('userModal')),
            company: new bootstrap.Modal(document.getElementById('companyModal')),
            gas: new bootstrap.Modal(document.getElementById('gasModal')),
            wifi: new bootstrap.Modal(document.getElementById('wifiModal')),
            calibration: new bootstrap.Modal(document.getElementById('calibrationModal')),
            confirmation: new bootstrap.Modal(document.getElementById('confirmationModal'))
        };
    },
    
    /**
     * Показывает страницу входа
     */
    showLogin: function() {
        document.getElementById('appView').classList.add('d-none');
        document.getElementById('loginView').classList.remove('d-none');
    },
    
    /**
     * Показывает основное приложение
     * @param {Object} user Данные пользователя
     */
    showApp: function(user) {
        document.getElementById('loginView').classList.add('d-none');
        document.getElementById('appView').classList.remove('d-none');
        
        // Обновить информацию о пользователе
        document.getElementById('currentUserName').textContent = user.name;
        document.getElementById('dashboardUserName').textContent = user.name;
        
        // Скрыть/показать элементы для администратора
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            if (user.role === 'admin') {
                el.classList.remove('d-none');
            } else {
                el.classList.add('d-none');
            }
        });
        
        // По умолчанию показать панель управления
        this.showView('dashboard');
    },
    
    /**
     * Показывает выбранное представление
     * @param {string} viewName Имя представления
     */
    showView: function(viewName) {
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
        }
    },
    
    /**
     * Показывает модальное окно подтверждения
     * @param {string} title Заголовок
     * @param {string} message Сообщение
     * @param {Function} callback Функция обратного вызова при подтверждении
     */
    showConfirmation: function(title, message, callback) {
        document.getElementById('confirmationTitle').textContent = title;
        document.getElementById('confirmationMessage').textContent = message;
        App.state.confirmCallback = callback;
        this.modals.confirmation.show();
    },
    
    /**
     * Обновляет опции компаний в выпадающих списках
     * @param {Array} companies Массив компаний
     */
    updateCompanyOptions: function(companies) {
        const companySelectors = document.querySelectorAll('#cylinderCompany, #userCompany');
        
        companySelectors.forEach(selector => {
            // Сохранить текущее значение
            const currentValue = selector.value;
            
            // Очистить опции (кроме первой в выпадающем списке пользователя, которая "Все компании")
            if (selector.id === 'userCompany') {
                // Оставить опцию "Все компании"
                while (selector.options.length > 1) {
                    selector.remove(1);
                }
            } else {
                // Очистить все опции
                selector.innerHTML = '<option value="">Выберите компанию</option>';
            }
            
            // Добавить опции компаний
            companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company;
                option.textContent = company;
                selector.appendChild(option);
            });
            
            // Восстановить предыдущее значение если оно все еще существует
            if (currentValue && Array.from(selector.options).some(opt => opt.value === currentValue)) {
                selector.value = currentValue;
            }
        });
    },
    
    /**
     * Обновляет опции газов в выпадающих списках
     * @param {Object} gases Объект с газами
     */
    updateGasOptions: function(gases) {
        const gasSelector = document.getElementById('cylinderGas');
        
        // Сохранить текущее значение
        const currentValue = gasSelector.value;
        
        // Очистить опции
        gasSelector.innerHTML = '<option value="">Выберите газ</option>';
        
        // Добавить опции газов
        for (const [gasName, gasDensity] of Object.entries(gases)) {
            const option = document.createElement('option');
            option.value = gasName;
            option.textContent = `${gasName} (${gasDensity} кг/л)`;
            gasSelector.appendChild(option);
        }
        
        // Восстановить предыдущее значение если оно все еще существует
        if (currentValue && Array.from(gasSelector.options).some(opt => opt.value === currentValue)) {
            gasSelector.value = currentValue;
        }
    }
};

// Экспортируем объект UI
window.UI = UI;