// admin.js
import { CONFIG } from './config.js';

class AdminPanel {
    constructor() {
        this.employees = [];
        this.moves = [];
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        await this.loadData();
    }

    setupEventListeners() {
        document.getElementById('applyFiltersBtn').addEventListener('click', () => {
            this.applyFilters();
        });
        
        // Устанавливаем сегодняшнюю дату
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateFilter').value = today;
    }

    async loadData() {
        try {
            // Загружаем список сотрудников
            const employeesResponse = await fetch(`${CONFIG.REST_URL}user.get`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const employeesData = await employeesResponse.json();
            if (employeesData.result) {
                this.employees = employeesData.result;
                this.populateEmployeeFilter();
            }
            
            // Загружаем историю (из localStorage или через API)
            this.loadHistoryFromLocal();
            
            this.applyFilters();
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    populateEmployeeFilter() {
        const select = document.getElementById('employeeFilter');
        this.employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.ID;
            option.textContent = emp.NAME || emp.LOGIN || `ID: ${emp.ID}`;
            select.appendChild(option);
        });
    }

    loadHistoryFromLocal() {
        // В реальном приложении данные должны загружаться с сервера
        const history = JSON.parse(localStorage.getItem('geolocation_history') || '[]');
        this.moves = history.map(item => ({
            ...item,
            userId: 1, // В реальном приложении берется из данных пользователя
            userName: 'Пользователь'
        }));
    }

    applyFilters() {
        const date = document.getElementById('dateFilter').value;
        const employeeId = document.getElementById('employeeFilter').value;
        
        let filtered = this.moves;
        
        if (date) {
            filtered = filtered.filter(move => {
                const moveDate = move.time.split(',')[0];
                return moveDate === date;
            });
        }
        
        if (employeeId !== 'all') {
            filtered = filtered.filter(move => move.userId === parseInt(employeeId));
        }
        
        this.renderStats(filtered);
        this.renderEmployees(filtered);
    }

    renderStats(moves) {
        // Группируем по сотрудникам
        const employeesMap = new Map();
        moves.forEach(move => {
            if (!employeesMap.has(move.userId)) {
                employeesMap.set(move.userId, {
                    id: move.userId,
                    name: move.userName,
                    count: 0
                });
            }
            employeesMap.get(move.userId).count++;
        });
        
        document.getElementById('totalEmployees').textContent = employeesMap.size;
        document.getElementById('totalMoves').textContent = moves.length;
        
        // Сегодняшние перемещения
        const today = new Date().toISOString().split('T')[0];
        const todayMoves = moves.filter(move => {
            const moveDate = move.time.split(',')[0];
            return moveDate === today;
        });
        document.getElementById('todayMoves').textContent = todayMoves.length;
    }

    renderEmployees(moves) {
        const container = document.getElementById('employeesList');
        
        if (moves.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">Нет данных за выбранный период</p>';
            return;
        }
        
        // Группируем по сотрудникам
        const employeesMap = new Map();
        moves.forEach(move => {
            if (!employeesMap.has(move.userId)) {
                employeesMap.set(move.userId, {
                    id: move.userId,
                    name: move.userName,
                    moves: []
                });
            }
            employeesMap.get(move.userId).moves.push(move);
        });
        
        let html = '';
        for (const [userId, data] of employeesMap) {
            html += `
                <div class="employee-card">
                    <div class="employee-header">
                        <div class="employee-name">👤 ${data.name}</div>
                        <div class="employee-stats">
                            <span>📍 ${data.moves.length} перемещений</span>
                        </div>
                    </div>
                    <div class="employee-moves">
                        ${data.moves.sort((a, b) => a.time.localeCompare(b.time)).map(move => `
                            <div class="move-item">
                                <div class="time">${move.time}</div>
                                <div class="comment">${move.comment}</div>
                                <div class="coords">📍 ${move.coords.lat.toFixed(6)}, ${move.coords.lng.toFixed(6)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});