/**
 * dashboard.js - Dashboard module implementation
 */

// Объект для работы с панелью управления
const Dashboard = {
    /**
     * Обновляет панель управления с текущими данными
     * @param {Array} cylinders Массив цилиндров
     */
    update: function(cylinders) {
        console.log('Updating dashboard with', cylinders ? cylinders.length : 0, 'cylinders');
        
        // Защита от ошибок
        if (!Array.isArray(cylinders)) {
            console.error('Invalid cylinders data:', cylinders);
            return;
        }
        
        // Получить элементы для обновления
        const totalCylindersEl = document.getElementById('totalCylinders');
        const lowLevelAlertsEl = document.getElementById('lowLevelAlerts');
        const offlineCylindersEl = document.getElementById('offlineCylinders');
        
        if (!totalCylindersEl || !lowLevelAlertsEl || !offlineCylindersEl) {
            console.error('Dashboard elements not found');
            return;
        }
        
        // Обновить итоговые цифры
        totalCylindersEl.textContent = cylinders.length;
        
        // Подсчет цилиндров с низким уровнем и отключенных
        let lowLevelCount = 0;
        let offlineCount = 0;
        const now = new Date();
        
        cylinders.forEach(cylinder => {
            // Проверяем, есть ли поле lstTm
            if (cylinder.lstTm) {
                const lastUpdate = new Date(cylinder.lstTm);
                const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
                
                // Проверить, низкий ли уровень цилиндра (меньше 20%)
                if (cylinder.level !== null && cylinder.vol && parseFloat(cylinder.vol) > 0) {
                    const levelPercentage = (cylinder.level / parseFloat(cylinder.vol)) * 100;
                    if (levelPercentage < 20) {
                        lowLevelCount++;
                    }
                }
                
                // Проверить, отключен ли цилиндр (нет обновлений более 24 часов)
                if (hoursSinceUpdate > 24) {
                    offlineCount++;
                }
            } else {
                // Если нет данных о последнем обновлении, считаем отключенным
                offlineCount++;
            }
        });
        
        lowLevelAlertsEl.textContent = lowLevelCount;
        offlineCylindersEl.textContent = offlineCount;
        
        // Обновить таблицу последних обновлений
        this.updateRecentUpdatesTable(cylinders);
    },
    
    /**
     * Обновляет таблицу последних обновлений
     * @param {Array} cylinders Массив цилиндров
     */
    updateRecentUpdatesTable: function(cylinders) {
        const recentUpdatesTable = document.getElementById('recentUpdatesTable');
        if (!recentUpdatesTable) {
            console.error('Recent updates table not found');
            return;
        }
        
        // Очистить таблицу
        recentUpdatesTable.innerHTML = '';
        
        // Защита от ошибок
        if (!Array.isArray(cylinders) || cylinders.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="5" class="text-center">Нет данных</td>';
            recentUpdatesTable.appendChild(emptyRow);
            return;
        }
        
        try {
            // Сортировать цилиндры по времени последнего обновления (новые в начале)
            const sortedCylinders = [...cylinders].sort((a, b) => {
                // Защита от отсутствующих дат
                if (!a.lstTm && !b.lstTm) return 0;
                if (!a.lstTm) return 1;
                if (!b.lstTm) return -1;
                
                return new Date(b.lstTm) - new Date(a.lstTm);
            });
            
            // Взять 10 самых последних цилиндров
            const recentCylinders = sortedCylinders.slice(0, 10);
            const now = new Date();
            
            recentCylinders.forEach(cylinder => {
                let hoursSinceUpdate = 0;
                
                if (cylinder.lstTm) {
                    const lastUpdate = new Date(cylinder.lstTm);
                    hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
                }
                
                let statusClass = 'bg-success';
                let statusText = 'Нормально';
                let levelPercentage = 0;
                
                if (cylinder.level !== null && cylinder.vol) {
                    levelPercentage = (cylinder.level / parseFloat(cylinder.vol)) * 100;
                }
                
                if (hoursSinceUpdate > 24) {
                    statusClass = 'bg-danger';
                    statusText = 'Не на связи';
                } else if (levelPercentage < 20) {
                    statusClass = 'bg-warning';
                    statusText = 'Низкий уровень';
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="#" class="cylinder-link" data-id="${cylinder.name}">${cylinder.name}</a></td>
                    <td>${cylinder.company || '-'}</td>
                    <td>${cylinder.level !== null ? cylinder.level.toFixed(1) + ' ' + (cylinder.mUnit || 'л') : '-'}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${window.Utils ? Utils.formatDateTime(cylinder.lstTm) : cylinder.lstTm}</td>
                `;
                
                recentUpdatesTable.appendChild(row);
            });
            
            // Добавить обработчики событий для ссылок на цилиндры
            this.addCylinderLinkHandlers();
        } catch (error) {
            console.error('Error updating recent updates table:', error);
            
            // В случае ошибки показать пустую таблицу
            const errorRow = document.createElement('tr');
            errorRow.innerHTML = '<td colspan="5" class="text-center">Ошибка загрузки данных</td>';
            recentUpdatesTable.appendChild(errorRow);
        }
    },
    
    /**
     * Добавляет обработчики событий для ссылок на цилиндры
     */
    addCylinderLinkHandlers: function() {
        document.querySelectorAll('.cylinder-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const cylinderId = this.getAttribute('data-id');
                
                if (window.Cylinders && typeof Cylinders.loadDetails === 'function') {
                    Cylinders.loadDetails(cylinderId);
                    
                    if (window.UI && typeof UI.showView === 'function') {
                        UI.showView('cylinderDetail');
                    }
                } else {
                    console.error('Cylinders module not loaded or loadDetails function not available');
                }
            });
        });
    }
};

// Экспортируем объект Dashboard
window.Dashboard = Dashboard;