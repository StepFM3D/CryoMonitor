/**
 * utils.js - Вспомогательные функции для приложения
 */

// Объект с вспомогательными функциями
const Utils = {
    /**
     * Отображает индикатор загрузки
     */
    showLoading: function() {
        document.getElementById('loadingOverlay').classList.remove('d-none');
    },
    
    /**
     * Скрывает индикатор загрузки
     */
    hideLoading: function() {
        document.getElementById('loadingOverlay').classList.add('d-none');
    },
    
    /**
     * Отображает сообщение об ошибке
     * @param {string} message Текст сообщения
     */
    showError: function(message) {
        alert(message); // Простой alert, можно заменить на более красивый тост или модальное окно
    },
    
    /**
     * Форматирует дату и время в локальный формат
     * @param {string} dateString Строка с датой и временем
     * @return {string} Отформатированная дата и время
     */
    formatDateTime: function(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return dateString; // Вернуть исходную строку если недействительная дата
        }
        
        // Использовать локальный формат даты и времени
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
};

// Экспортируем объект Utils
window.Utils = Utils;