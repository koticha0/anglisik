// Элементы DOM
const exercisesContainer = document.getElementById('exercisesContainer');
const searchInput = document.getElementById('searchInput');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const noResults = document.getElementById('noResults');
const disclaimerModal = document.getElementById('disclaimerModal');
const closeDisclaimerBtn = document.getElementById('closeDisclaimerBtn');
const body = document.body;

// --- ДАННЫЕ --- 
let allExercises = [];

// --- ТЕМНАЯ ТЕМА ---
const savedTheme = localStorage.getItem('theme');
const themeIcon = themeToggleBtn.querySelector('span');

if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    themeIcon.textContent = 'light_mode';
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// --- DISCLAIMER MODAL ---
function showDisclaimer() {
    setTimeout(() => {
        disclaimerModal.classList.add('active');
    }, 500);
}

if (closeDisclaimerBtn) {
    closeDisclaimerBtn.addEventListener('click', () => {
        disclaimerModal.classList.remove('active');
    });
}

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadExercises() {
    try {
        const response = await fetch('data/all_exercises.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allExercises = await response.json();
        renderExercises(allExercises);
        showDisclaimer();
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        exercisesContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Не удалось загрузить ответы. Проверьте подключение к интернету или попробуйте позже.</div>';
    }
}

// Помощник для форматирования Markdown
function parseMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    } else {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
}

// --- ФУНКЦИЯ КОПИРОВАНИЯ (С ФОЛБЭКОМ) ---
function copyToClipboard(encodedText, btn) {
    // Декодируем текст (восстанавливаем кавычки)
    const text = decodeURIComponent(encodedText);

    // Убираем HTML теги для чистого текста
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = parseMarkdown(text);
    const textToCopy = tempDiv.innerText || tempDiv.textContent;

    // Функция визуального успеха
    const showSuccess = () => {
        const iconSpan = btn.querySelector('span');
        const originalIcon = 'content_copy'; 
        
        iconSpan.textContent = 'check'; // Галочка
        btn.classList.add('copied');
        
        setTimeout(() => {
            iconSpan.textContent = originalIcon;
            btn.classList.remove('copied');
        }, 2000);
    };

    // 1. Попытка через современный API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
            .then(showSuccess)
            .catch(err => {
                console.warn('Clipboard API failed, trying fallback:', err);
                fallbackCopyText(textToCopy, showSuccess);
            });
    } else {
        // 2. Фолбэк для старых браузеров или локальных файлов (file://)
        fallbackCopyText(textToCopy, showSuccess);
    }
}

function fallbackCopyText(text, onSuccess) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Скрываем элемент, но оставляем его доступным для выделения
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            onSuccess();
        } else {
            alert('Не удалось скопировать текст автоматически.');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Ошибка при копировании.');
    }

    document.body.removeChild(textArea);
}

// Функция отрисовки заданий
function renderExercises(exercises) {
    exercisesContainer.innerHTML = '';
    
    if (!exercises || exercises.length === 0) {
        noResults.classList.remove('hidden');
        return;
    } else {
        noResults.classList.add('hidden');
    }

    exercises.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        
        const renderedAnswer = parseMarkdown(ex.answer);
        const renderedTranslation = ex.translation ? ex.translation : ''; 

        // Кодируем текст для безопасной передачи в HTML атрибут
        const safeAnswer = encodeURIComponent(ex.answer).replace(/'/g, '%27');

        let htmlContent = `
            <div class="card-header">
                <span class="ex-number">${ex.number}</span>
                <span class="ex-page">${ex.page}</span>
            </div>
            <div class="ex-task">
                <p><strong>Задание:</strong> ${ex.task}</p>
                ${ex.task_ru ? `<p style="opacity: 0.8; font-style: italic; margin-top: 5px;">${ex.task_ru}</p>` : ''}
            </div>
            
            <div class="button-group">
                <button class="toggle-answer-btn" onclick="toggleAnswer(this)">Показать ответ</button>
                <button class="copy-btn" onclick="copyToClipboard('${safeAnswer}', this)" title="Копировать ответ">
                    <span class="material-symbols-rounded">content_copy</span>
                </button>
            </div>

            <div class="answer-box hidden">
                <div class="answer-content">
                    ${renderedAnswer}
                </div>
        `;

        if (renderedTranslation) {
            htmlContent += `
                <div class="translation-content" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border-color);">
                    <p><strong>Перевод / Пояснение:</strong></p>
                    <div>${renderedTranslation}</div>
                </div>
            `;
        }

        htmlContent += `</div>`;
        
        card.innerHTML = htmlContent;
        exercisesContainer.appendChild(card);
    });
}

// Функция переключения ответа
window.toggleAnswer = function(btn) {
    const buttonGroup = btn.parentElement;
    const answerBox = buttonGroup.nextElementSibling;
    const isHidden = answerBox.classList.contains('hidden');
    
    if (isHidden) {
        answerBox.classList.remove('hidden');
        btn.textContent = 'Скрыть ответ';
        btn.classList.add('active');
    } else {
        answerBox.classList.add('hidden');
        btn.textContent = 'Показать ответ';
        btn.classList.remove('active');
    }
};

window.copyToClipboard = copyToClipboard;

// --- ПОИСК ---
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        renderExercises(allExercises);
        return;
    }

    const filtered = allExercises.filter(ex => {
        const pageMatch = ex.page.toLowerCase().includes(query);
        const numberMatch = ex.number.toLowerCase().includes(query);
        const taskMatch = ex.task.toLowerCase().includes(query);
        return pageMatch || numberMatch || taskMatch;
    });

    renderExercises(filtered);
});

// Инициализация
loadExercises();