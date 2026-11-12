Here is a complete, single HTML file that implements the habit tracker using local storage to ensure data persists between sessions.

This solution uses modern JavaScript and CSS for a clean, functional interface.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Habit Tracker</title>
    <style>
        :root {
            --primary-color: #4CAF50;
            --secondary-color: #f4f4f9;
            --text-color: #333;
            --border-color: #ddd;
            --danger-color: #f44336;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--secondary-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 800px;
        }

        h1 {
            text-align: center;
            color: var(--primary-color);
            margin-bottom: 30px;
        }

        /* Habit Input Form */
        #add-habit-form {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
        }

        #habit-name-input {
            flex-grow: 1;
            padding: 12px;
            border: 2px solid var(--border-color);
            border-radius: 6px;
            font-size: 16px;
        }

        #add-habit-btn {
            padding: 12px 20px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
        }

        #add-habit-btn:hover {
            background-color: #45a049;
        }

        /* Habit List */
        #habit-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .habit-card {
            background: #fff;
            border: 1px solid var(--border-color);
            padding: 15px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: box-shadow 0.2s;
        }

        .habit-card:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .habit-info {
            flex-grow: 1;
        }

        .habit-name {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .streak-info {
            font-size: 0.9em;
            color: #666;
        }

        .habit-actions {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        /* Ticking Mechanism */
        .tick-button {
            padding: 10px 15px;
            background-color: #eee;
            border: 1px solid var(--border-color);
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 14px;
        }

        .tick-button.completed {
            background-color: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }

        .tick-button:hover:not(.completed) {
            background-color: #e0e0e0;
        }

        .tick-button.completed:hover {
            background-color: #43a047;
        }

        /* Deletion Button */
        .delete-btn {
            background: none;
            border: none;
            color: var(--danger-color);
            cursor: pointer;
            font-size: 1.1em;
            margin-left: 10px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .delete-btn:hover {
            opacity: 1;
        }

        /* History Display */
        .history-container {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed var(--border-color);
        }

        .history-header {
            font-size: 0.85em;
            font-weight: bold;
            margin-bottom: 5px;
            color: #555;
        }

        .history-grid {
            display: flex;
            gap: 4px;
        }

        .day-indicator {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            background-color: #ccc;
            border: 1px solid #ddd;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .day-indicator.done {
            background-color: var(--primary-color);
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>🌱 My Habit Tracker</h1>

        <!-- Add New Habit Form -->
        <form id="add-habit-form">
            <input type="text" id="habit-name-input" placeholder="e.g., Drink 8 glasses of water" required>
            <button type="submit" id="add-habit-btn">Add Habit</button>
        </form>

        <!-- Habit List Container -->
        <div id="habit-list">
            <!-- Habits will be injected here by JavaScript -->
        </div>
    </div>

    <script>
        const HABIT_STORAGE_KEY = 'habitTrackerData';
        const habitListElement = document.getElementById('habit-list');
        const addHabitForm = document.getElementById('add-habit-form');
        const habitNameInput = document.getElementById('habit-name-input');

        let habits = [];

        // --- Utility Functions ---

        /**
         * Gets today's date in YYYY-MM-DD format.
         * @returns {string} Today's date string.
         */
        function getTodayDateString() {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        /**
         * Calculates the streak for a given habit based on its history.
         * @param {Array<string>} history - Array of dates (YYYY-MM-DD) where the habit was completed.
         * @returns {number} The current streak count.
         */
        function calculateStreak(history) {
            if (!history || history.length === 0) return 0;

            const today = new Date();
            const todayStr = getTodayDateString();
            let streak = 0;
            let currentDate = new Date();

            // Check backwards from today
            for (let i = 0; i < 365; i++) { // Check up to a year back
                const date = new Date();
                date.setDate(currentDate.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                if (dateStr === todayStr) {
                    // Start checking from today
                    let checkDate = new Date();
                    let currentStreak = 0;
                    while (true) {
                        const checkDateStr = checkDate.toISOString().split('T')[0];
                        if (history.includes(checkDateStr)) {
                            currentStreak++;
                            checkDate.setDate(checkDate.getDate() + 1);
                        } else {
                            break;
                        }
                    }
                    return currentStreak;
                }
            }
            return 0; // Should not happen if logic is correct
        }


        // --- Data Management ---

        /**
         * Loads habits from Local Storage.
         */
        function loadHabits() {
            const storedData = localStorage.getItem(HABIT_STORAGE_KEY);
            if (storedData) {
                habits = JSON.parse(storedData);
            }
            renderHabits();
        }

        /**
         * Saves the current state of habits to Local Storage.
         */
        function saveHabits() {
            localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(habits));
        }

        // --- Rendering and UI ---

        /**
         * Renders the entire list of habits to the DOM.
         */
        function renderHabits() {
            habitListElement.innerHTML = '';

            if (habits.length === 0) {
                habitListElement.innerHTML = '<p style="text-align: center; color: #888;">No habits added yet. Start tracking your goals above!</p>';
                return;
            }

            habits.forEach(habit => {
                const card = document.createElement('div');
                card.className = 'habit-card';
                card.dataset.id = habit.id;

                // Calculate streak and history for display
                const streak = calculateStreak(habit.history);
                
                // Generate the 7-day history view
                const historyHtml = generateHistoryView(habit.history);

                card.innerHTML = `
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="streak-info">🔥 Current Streak: ${streak} days</div>
                        <div class="history-container">
                            <div class="history-header">Last 7 Days:</div>
                            <div class="history-grid" id="history-${habit.id}">
                                ${historyHtml}
                            </div>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="tick-button" data-id="${habit.id}" data-completed="${habit.history.includes(getTodayDateString())}">
                            ${habit.history.includes(getTodayDateString()) ? '✅ Done Today' : 'Mark Complete'}
                        </button>
                        <button class="delete-btn" data-id="${habit.id}">&times;</button>
                    </div>
                `;
                habitListElement.appendChild(card);
            });

            attachEventListeners();
        }

        /**
         * Generates the HTML for the last 7 days view.
         * @param {Array<string>} history - The habit's completion dates.
         * @returns {string} HTML string of day indicators.
         */
        function generateHistoryView(history) {
            let html = '';
            const today = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const isDone = history.includes(dateStr);
                
                // Simple label for the day (e.g., 'T' for Today, 'M' for Monday)
                const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

                html += `
                    <div class="day-indicator ${isDone ? 'done' : ''}" 
                         data-date="${dateStr}" 
                         title="${dayLabel}">
                    </div>
                `;
            }
            return html;
        }


        // --- Event Handlers ---

        /**
         * Handles adding a new habit.
         * @param {Event} e - The form submit event.
         */
        function handleAddHabit(e) {
            e.preventDefault();
            const name = habitNameInput.value.trim();
            if (name) {
                const newHabit = {
                    id: Date.now(), // Simple unique ID
                    name: name,
                    history: [] // Array of dates (YYYY-MM-DD)
                };
                habits.push(newHabit);
                saveHabits();
                renderHabits();
                habitNameInput.value = '';
            }
        }

        /**
         * Handles ticking a habit off for today or deleting it.
         * @param {Event} e - The click event.
         */
        function handleHabitAction(e) {
            const target = e.target;
            const id = parseInt(target.dataset.id);

            if (!id) return;

            const habitIndex = habits.findIndex(h => h.id === id);
            if (habitIndex === -1) return;

            const habit = habits[habitIndex];
            const todayStr = getTodayDateString();

            // 1. Handle Ticking/Unticking
            if (target.classList.contains('tick-button')) {
                const isCompleted = target.dataset.completed === 'true';
                
                if (isCompleted) {
                    // Untick: Remove today's date from history
                    habit.history = habit.history.filter(date => date !== todayStr);
                } else {
                    // Tick: Add today's date to history
                    habit.history.push(todayStr);
                }
                saveHabits();
                renderHabits(); // Re-render to update UI and streak
                return;
            }

            // 2. Handle Deletion
            if (target.classList.contains('delete-btn')) {
                if (confirm(`Are you sure you want to delete the habit: "${habit.name}"?`)) {
                    habits = habits.filter(h => h.id !== id);
                    saveHabits();
                    renderHabits();
                }
            }
        }

        /**
         * Attaches all necessary event listeners after rendering.
         */
        function attachEventListeners() {
            // Use event delegation on the habit list for efficiency
            habitListElement.removeEventListener('click', handleHabitAction);
            habitListElement.addEventListener('click', handleHabitAction);
        }


        // --- Initialization ---
        
        // Event Listeners Setup
        addHabitForm.addEventListener('submit', handleAddHabit);

        // Load data when the page loads
        document.addEventListener('DOMContentLoaded', loadHabits);

    </script>
</body>
</html>
```