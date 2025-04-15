/**
 * cylinders.js - Логика для работы с цилиндрами
 */

// Объект для работы с цилиндрами
const Cylinders = {
    /**
     * Обновляет список цилиндров
     * @param {Array} cylinders Массив цилиндров
     */
    updateList: function(cylinders) {
        const container = document.getElementById('cylindersContainer');
        container.innerHTML = '';
        
        cylinders.forEach(cylinder => {
            const lastUpdate = new Date(cylinder.lstTm);
            const now = new Date();
            const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
            
            let statusClass = 'text-success';
            let statusText = 'Нормально';
            let levelPercentage = 0;
            
            if (cylinder.level !== null && cylinder.vol) {
                levelPercentage = (cylinder.level / cylinder.vol) * 100;
                if (levelPercentage > 100) levelPercentage = 100;
            }
            
            if (hoursSinceUpdate > 24) {
                statusClass = 'text-danger';
                statusText = 'Не на связи';
            } else if (levelPercentage < 20) {
                statusClass = 'text-warning';
                statusText = 'Низкий уровень';
            }
            
            const interval = parseFloat(cylinder.sleep || 1);
            const intervalText = interval < 1 
                ? `${Math.round(interval * 60)} мин` 
                : `${interval} ч`;
            
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4';
            card.innerHTML = `
                <div class="card cylinder-card mb-4">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="card-title mb-0">${cylinder.name}</h5>
                            <span class="badge ${statusClass.replace('text-', 'bg-')}">${statusText}</span>
                        </div>
                        <p class="text-muted">${cylinder.company || 'Нет компании'}</p>
                        
                        <div class="level-indicator">
                            <div class="level-fill" style="width: ${levelPercentage}%;"></div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <small class="text-muted">Уровень</small>
                                <div>${cylinder.level !== null ? cylinder.level.toFixed(1) + ' ' + cylinder.mUnit : '-'}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Батарея</small>
                                <div>${cylinder.ubt ? cylinder.ubt.toFixed(1) + ' В' : '-'}</div>
                            </div>
                        </div>
                        
                        <small class="text-muted">Последнее обновление: ${Utils.formatDateTime(cylinder.lstTm)}</small>
                        <div class="mt-3">
                            <small class="text-muted">${cylinder.gas || '-'} | ${cylinder.vol ? cylinder.vol + ' Л' : '-'} | ${intervalText}</small>
                        </div>
                    </div>
                </div>
            `;
            
            // Добавить обработчик клика для просмотра деталей цилиндра
            const cylinderCard = card.querySelector('.cylinder-card');
            cylinderCard.addEventListener('click', () => this.loadDetails(cylinder.name));
            
            container.appendChild(card);
        });
    },
    
    /**
     * Загружает детали цилиндра
     * @param {string} cylinderId ID цилиндра
     */
    loadDetails: function(cylinderId) {
        Utils.showLoading();
        
        API.getCylinderDetails(cylinderId, true)
            .then(data => {
                if (data.status === 'success') {
                    App.state.selectedCylinder = data.data;
                    this.displayDetails();
                    UI.showView('cylinderDetail');
                } else {
                    Utils.showError(data.message || 'Не удалось загрузить данные цилиндра');
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки деталей цилиндра:', error);
                Utils.showError('Не удалось загрузить данные цилиндра');
            })
            .finally(() => {
                Utils.hideLoading();
            });
    },
    
    /**
     * Отображает детали цилиндра
     */
    displayDetails: function() {
        const cylinder = App.state.selectedCylinder;
        
        // Установить базовую информацию
        document.getElementById('cylinderDetailName').textContent = cylinder.name;
        document.getElementById('cylinderDetailId').textContent = cylinder.id || '-';
        document.getElementById('cylinderDetailCompany').textContent = cylinder.company || '-';
        document.getElementById('cylinderDetailGas').textContent = cylinder.gas || '-';
        document.getElementById('cylinderDetailVolume').textContent = cylinder.vol ? cylinder.vol + ' Л' : '-';
        
        const interval = parseFloat(cylinder.sleep || 1);
        document.getElementById('cylinderDetailInterval').textContent = interval < 1 
            ? `${Math.round(interval * 60)} минут` 
            : `${interval} часов`;
        
        document.getElementById('cylinderDetailPrssOn').textContent = cylinder.prssOn == 1 ? 'Включен' : 'Отключен';
        document.getElementById('cylinderDetailLastUpdate').textContent = Utils.formatDateTime(cylinder.lstTm);
        
        // Установить значения уровня и давления
        document.getElementById('cylinderDetailLevel').textContent = cylinder.level !== null ? cylinder.level.toFixed(1) : '-';
        document.getElementById('cylinderDetailUnit').textContent = cylinder.mUnit || 'Л';
        
        // Рассчитать процент уровня
        let levelPercentage = 0;
        if (cylinder.level !== null && cylinder.vol) {
            levelPercentage = (cylinder.level / cylinder.vol) * 100;
            if (levelPercentage > 100) levelPercentage = 100;
        }
        
        document.getElementById('cylinderDetailLevelIndicator').style.width = `${levelPercentage}%`;
        
        // Показать/скрыть секцию давления
        const pressureSections = document.querySelectorAll('.pressure-section, .pressure-row');
        if (cylinder.prssOn == 1) {
            pressureSections.forEach(section => section.classList.remove('d-none'));
            document.getElementById('cylinderDetailPressure').textContent = cylinder.pressure !== null ? cylinder.pressure.toFixed(1) : '-';
        } else {
            pressureSections.forEach(section => section.classList.add('d-none'));
        }
        
        // Установить значение батареи
        document.getElementById('cylinderDetailBattery').textContent = cylinder.ubt ? cylinder.ubt.toFixed(1) : '-';
        
        // Установить сырые значения
        document.getElementById('cylinderDetailLADC').textContent = cylinder.lADC || '-';
        document.getElementById('cylinderDetailLevelCalibration').textContent = 
            `m=${cylinder.mLvl ? cylinder.mLvl.toFixed(5) : '-'}, d=${cylinder.dLvl ? cylinder.dLvl.toFixed(2) : '-'}`;
        
        document.getElementById('cylinderDetailPADC').textContent = cylinder.pADC || '-';
        document.getElementById('cylinderDetailPressureCalibration').textContent = 
            `m=${cylinder.mPrss ? cylinder.mPrss.toFixed(5) : '-'}, d=${cylinder.dPrss ? cylinder.dPrss.toFixed(2) : '-'}`;
        
        // Обновить график истории
        this.updateHistoryChart('24h');
    },
    
    /**
     * Обновляет график истории
     * @param {string} timeRange Временной диапазон
     */
    updateHistoryChart: function(timeRange) {
        if (!App.state.selectedCylinder || !App.state.selectedCylinder.history) return;
        
        const historyData = App.state.selectedCylinder.history;
        let filteredData = [];
        
        // Фильтровать данные по временному диапазону
        const now = new Date();
        
        switch (timeRange) {
            case '24h':
                const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                filteredData = historyData.filter(item => new Date(item.timestamp) >= dayAgo);
                break;
            case '7d':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filteredData = historyData.filter(item => new Date(item.timestamp) >= weekAgo);
                break;
            case '30d':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filteredData = historyData.filter(item => new Date(item.timestamp) >= monthAgo);
                break;
            default:
                filteredData = historyData;
        }
        
        // Подготовить данные для графика
        const chartData = {
            labels: filteredData.map(item => Utils.formatDateTime(item.timestamp)),
            datasets: [
                {
                    label: `Уровень (${App.state.selectedCylinder.mUnit})`,
                    data: filteredData.map(item => item.level),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        };
        
        // Добавить набор данных давления если включено
        if (App.state.selectedCylinder.prssOn == 1) {
            chartData.datasets.push({
                label: 'Давление (бар)',
                data: filteredData.map(item => item.pressure),
                borderColor: '#9b59b6',
                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                tension: 0.3,
                fill: true,
                yAxisID: 'y1'
            });
        }
        
        if (!chartElement) {
            console.error('История цилиндра: элемент historyChart не найден в DOM');
            return;
        }
        
        // И ЭТУ ПРОВЕРКУ:
        if (chartElement.tagName.toLowerCase() !== 'canvas') {
            console.error('История цилиндра: элемент historyChart не является canvas элементом');
            console.log('Тип элемента:', chartElement.tagName);
            return;
        }

        if (App.state.chart) {
            App.state.chart.destroy();
        }
        
        try {
            // Создать новый график
            const ctx = chartElement.getContext('2d');
            
            // Проверить, что Chart определен
            if (typeof Chart === 'undefined') {
                console.error('История цилиндра: библиотека Chart.js не загружена');
                return;
            }
            
            App.state.chart = new Chart(ctx, {
                // ... [настройки графика] ...
            });
        } catch (error) {
            console.error('Ошибка при создании графика:', error);
        }
        
        
        // Создать новый график
        const ctx = document.getElementById('historyChart').getContext('2d');
        App.state.chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Время'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `Уровень (${App.state.selectedCylinder.mUnit})`
                        }
                    },
                    y1: {
                        display: App.state.selectedCylinder.prssOn == 1,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Давление (бар)'
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Подготавливает и показывает форму для калибровки
     */
    showCalibrationForm: function() {
        if (!App.state.selectedCylinder) return;
        
        // Сбросить форму
        document.getElementById('calibrationForm').reset();
        document.getElementById('calibrationCylinderId').value = App.state.selectedCylinder.name;
        
        // Установить текущие значения АЦП
        document.getElementById('currentLevelADC').textContent = App.state.selectedCylinder.lADC || '-';
        document.getElementById('currentPressureADC').textContent = App.state.selectedCylinder.pADC || '-';
        
        // Показать/скрыть секцию калибровки давления
        const pressureSection = document.querySelector('.pressure-calibration-section');
        if (App.state.selectedCylinder.prssOn == 1) {
            pressureSection.classList.remove('d-none');
        } else {
            pressureSection.classList.add('d-none');
        }
        
        // Показать модальное окно
        UI.modals.calibration.show();
    },
    
    /**
     * Сохраняет калибровку цилиндра
     */
    saveCalibration: function() {
        const form = document.getElementById('calibrationForm');
        
        if (form.checkValidity()) {
            const cylinderId = document.getElementById('calibrationCylinderId').value;
            
            const calibrationData = {
                l0: document.getElementById('l0').value,
                l1: document.getElementById('l1').value
            };
            
            // Добавить калибровку давления если включена
            if (App.state.selectedCylinder.prssOn == 1) {
                calibrationData.p0 = document.getElementById('p0').value;
                calibrationData.p1 = document.getElementById('p1').value;
                calibrationData.prss1 = document.getElementById('prss1').value;
            }
            
            Utils.showLoading();
            
            API.calibrateCylinder(cylinderId, calibrationData)
                .then(data => {
                    if (data.status === 'success') {
                        UI.modals.calibration.hide();
                        this.loadDetails(cylinderId);
                    } else {
                        Utils.showError(data.message || 'Не удалось сохранить калибровку');
                    }
                })
                .catch(error => {
                    console.error('Ошибка сохранения калибровки:', error);
                    Utils.showError('Не удалось сохранить калибровку');
                })
                .finally(() => {
                    Utils.hideLoading();
                });
        } else {
            form.reportValidity();
        }
    },
    
    /**
     * Инициирует удаление цилиндра
     */
    deleteCylinder: function() {
        if (!App.state.selectedCylinder) return;
        
        // Показать подтверждение
        UI.showConfirmation(
            'Удаление цилиндра',
            `Вы уверены, что хотите удалить цилиндр "${App.state.selectedCylinder.name}"? Это действие нельзя отменить.`,
            () => {
                Utils.showLoading();
                
                API.deleteCylinder(App.state.selectedCylinder.name)
                    .then(data => {
                        if (data.status === 'success') {
                            UI.modals.confirmation.hide();
                            UI.showView('cylinders');
                            App.refreshData();
                        } else {
                            Utils.showError(data.message || 'Не удалось удалить цилиндр');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка удаления цилиндра:', error);
                        Utils.showError('Не удалось удалить цилиндр');
                    })
                    .finally(() => {
                        Utils.hideLoading();
                    });
            }
        );
    }
};

// Экспортируем объект Cylinders
window.Cylinders = Cylinders;