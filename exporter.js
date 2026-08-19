// exporter.js
import { CONFIG } from './config.js';

export class HistoryExporter {
    constructor() {
        this.user = null;
    }

    setUser(user) {
        this.user = user;
    }

    // ====== ПОЛУЧАЕМ ИСТОРИЮ ======
    getHistory() {
        try {
            const data = localStorage.getItem('geolocation_history');
            if (!data) return [];
            const history = JSON.parse(data);
            // Фильтруем по текущему пользователю
            if (this.user && this.user.id) {
                return history.filter(item => item.userId === this.user.id);
            }
            return history;
        } catch (e) {
            console.error('Ошибка чтения истории:', e);
            return [];
        }
    }

    // ====== ФОРМИРУЕМ CSV ======
    historyToCSV(history) {
        if (!history || history.length === 0) {
            return null;
        }

        // Заголовки
        const headers = ['Время', 'Комментарий', 'Широта', 'Долгота', 'Точность', 'Ссылка на карту'];
        const rows = [headers];

        // Данные
        history.forEach(item => {
            const lat = item.coords?.lat?.toFixed(6) || '';
            const lng = item.coords?.lng?.toFixed(6) || '';
            const mapLink = lat && lng ? 
                `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map` : 
                '';

            rows.push([
                item.time || '',
                item.comment || '',
                lat,
                lng,
                item.coords?.accuracy || '',
                mapLink
            ]);
        });

        // Конвертируем в CSV
        const csvContent = rows
            .map(row => row.map(cell => {
                // Экранируем кавычки и запятые
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(','))
            .join('\n');

        return csvContent;
    }

    // ====== ФОРМИРУЕМ EXCEL (XLSX через HTML-таблицу) ======
    historyToExcelHTML(history) {
        if (!history || history.length === 0) {
            return null;
        }

        const userName = this.user?.name || 'Пользователь';
        const exportDate = new Date().toLocaleString('ru-RU');

        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel"
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>История</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
                    th { background-color: #FF7300; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; text-align: left; }
                    td { padding: 6px 8px; border: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .header-info { margin-bottom: 16px; font-family: Arial, sans-serif; }
                    .header-info h2 { color: #FF7300; margin: 0; }
                    .header-info p { color: #666; margin: 4px 0; }
                </style>
            </head>
            <body>
                <div class="header-info">
                    <h2>📍 История геолокации</h2>
                    <p><strong>Сотрудник:</strong> ${userName}</p>
                    <p><strong>Дата экспорта:</strong> ${exportDate}</p>
                    <p><strong>Всего записей:</strong> ${history.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Время</th>
                            <th>Комментарий</th>
                            <th>Широта</th>
                            <th>Долгота</th>
                            <th>Точность (м)</th>
                            <th>Ссылка на карту</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        history.forEach((item, index) => {
            const lat = item.coords?.lat?.toFixed(6) || '';
            const lng = item.coords?.lng?.toFixed(6) || '';
            const mapLink = lat && lng ? 
                `https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map` : 
                '';

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.time || ''}</td>
                    <td>${item.comment || ''}</td>
                    <td>${lat}</td>
                    <td>${lng}</td>
                    <td>${item.coords?.accuracy || ''}</td>
                    <td><a href="${mapLink}">Открыть карту</a></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        return html;
    }

    // ====== СКАЧИВАНИЕ ФАЙЛА ======
    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // ====== ЭКСПОРТ В EXCEL ======
    exportToExcel() {
        const history = this.getHistory();
        
        if (!history || history.length === 0) {
            alert('📭 История пуста. Сначала отправьте хотя бы одну геолокацию.');
            return null;
        }

        const html = this.historyToExcelHTML(history);
        if (!html) {
            alert('❌ Ошибка формирования файла');
            return null;
        }

        const userName = this.user?.name?.replace(/[^а-яА-Яa-zA-Z0-9]/g, '_') || 'Пользователь';
        const date = new Date().toISOString().slice(0, 10);
        const fileName = `История_геолокации_${userName}_${date}.xls`;

        this.downloadFile(html, fileName, 'application/vnd.ms-excel');
        return true;
    }

    // ====== ЭКСПОРТ В CSV ======
    exportToCSV() {
        const history = this.getHistory();
        
        if (!history || history.length === 0) {
            alert('📭 История пуста. Сначала отправьте хотя бы одну геолокацию.');
            return null;
        }

        const csv = this.historyToCSV(history);
        if (!csv) {
            alert('❌ Ошибка формирования файла');
            return null;
        }

        const userName = this.user?.name?.replace(/[^а-яА-Яa-zA-Z0-9]/g, '_') || 'Пользователь';
        const date = new Date().toISOString().slice(0, 10);
        const fileName = `История_геолокации_${userName}_${date}.csv`;

        // Добавляем BOM для правильного отображения кириллицы в Excel
        const content = '\uFEFF' + csv;
        this.downloadFile(content, fileName, 'text/csv;charset=utf-8');
        return true;
    }
}