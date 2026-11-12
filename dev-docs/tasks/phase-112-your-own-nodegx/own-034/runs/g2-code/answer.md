Here is a complete, single-file HTML solution for a habit tracker. It uses `localStorage` to persist the data, so it will remember your habits even if you close the browser.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Habit Tracker</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #fff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 30px;
        }
        /* Habit Input Section */
        #habit-input-section {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        #new-habit-name {
            flex-grow: 1;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 16px;
        }
        #add-habit-btn {
            padding: 10px 20px;
            background-color: #2ecc71;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
        }
        #add-habit-btn:hover {
            background-color: #27ae60;
        }

        /* Habit List */
        .habit-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #eee;
            transition: background-color 0.2s;
        }
        .habit-item:hover {
            background-color: #f9f9f9;
        }
        .habit-info {
            flex-grow: 1;
        }
        .habit-name {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 5px;
        }
        .habit-stats {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
            color: #7f8c8d;
        }
        .streak-count {
            font-weight: bold;
            color: #e74c3c;
        }
        .delete-btn {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        .delete-btn:hover {
            background: #c0392b;
        }

        /* Tracker Grid */
        .tracker-grid {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #eee;
        }
        .day-cell {
            width: 30px;
            height: 30px;
            border: 1px solid #ddd;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            background-color: #fff;
        }
        .day-cell.completed {
            background-color: #2ecc71;
            color: white;
            border-color: #2ecc71;
        }
        .day-cell.completed:hover {
            background-color: #27ae60;
        }
        .day-cell.completed::after {
            content: '✓';
            font-weight: bold;
        }
        .day-cell.pending:not(.completed):hover {
            background-color: #f1c40f;
        }
        .day-cell.pending::after {
            content: '';
        }
        .day-cell.today {
            border: 2px solid #3498db;
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>🚀 Daily Habit Tracker</h1>

        <!-- Habit Input -->
        <div id="habit-input-section">
            <input type="text" id="new-habit-name" placeholder="Enter a new habit (e.g., Drink Water)">
            <button id="add-habit-btn">Add Habit</button>
        </div>

        <!-- Habit List -->
        <div id="habit-list">
            <!-- Habits will be injected here by JavaScript -->
        </div>
    </div>

    <script>
        const STORAGE_KEY = 'habitTrackerData';
        let habits = [];
        let today = new Date().toDateString();

        // --- Utility Functions ---

        function getHabits() {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        }

        function saveHabits() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
        }

        function getHabitData(name) {
            return habits.find(h => h.name === name);
        }

        // --- Core Logic ---

        function addHabit() {
            const inputElement = document.getElementById('new-habit-name');
            const name = inputElement.value.trim();

            if (name === "") {
                alert("Please enter a habit name.");
                return;
            }

            const newHabit = {
                id: Date.now(),
                name: name,
                history: {} // Stores dates as keys: { 'YYYY-MM-DD': true/false }
            };

            habits.push(newHabit);
            saveHabits();
            renderHabits();
            inputElement.value = '';
        }

        function deleteHabit(id) {
            if (confirm("Are you sure you want to delete this habit? This cannot be undone.")) {
                habits = habits.filter(h => h.id !== id);
                saveHabits();
                renderHabits();
            }
        }

        function toggleHabitCompletion(habitId) {
            const habit = getHabitData(habits.find(h => h.id === habitId).name);
            if (!habit) return;

            const todayKey = today;
            
            // Toggle the completion status for today
            habit.history[todayKey] = !habit.history[todayKey];
            
            saveHabits();
            renderHabits();
        }

        // --- Rendering Functions ---

        function calculateStreak(habit) {
            let streak = 0;
            let currentDate = new Date();
            
            // Check the last 7 days backwards
            for (let i = 0; i < 7; i++) {
                currentDate.setDate(currentDate.getDate() - i);
                const dateKey = currentDate.toDateString();
                
                if (habit.history[dateKey] === true) {
                    streak++;
                } else {
                    // If any day in the sequence is missed, the streak is broken
                    break;
                }
            }
            return streak;
        }

        function renderHabits() {
            const listContainer = document.getElementById('habit-list');
            listContainer.innerHTML = '';

            if (habits.length === 0) {
                listContainer.innerHTML = '<p style="text-align: center; color: #95a5a6;">No habits added yet. Start tracking!</p>';
                return;
            }

            habits.forEach(habit => {
                const streak = calculateStreak(habit);
                const isCompletedToday = habit.history[today] === true;

                const habitElement = document.createElement('div');
                habitElement.className = 'habit-item';
                habitElement.innerHTML = `
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-stats">
                            <span>🔥 Streak: <span class="streak-count">${streak}</span> days</span>
                            <span>Completed Today: ${isCompletedToday ? '✅' : '⏳'}</span>
                        </div>
                    </div>
                    <button class="delete-btn" data-id="${habit.id}">Delete</button>
                    <div class="tracker-grid">
                        ${generateTrackerGrid(habit)}
                    </div>
                `;
                listContainer.appendChild(habitElement);
            });

            // Attach event listeners after rendering
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    deleteHabit(id);
                });
            });

            // Attach completion listeners to the grid cells
            document.querySelectorAll('.day-cell').forEach(cell => {
                cell.addEventListener('click', (e) => {
                    const habitElement = e.target.closest('.habit-item');
                    if (habitElement) {
                        const habitId = parseInt(habitElement.querySelector('.delete-btn').getAttribute('data-id'));
                        toggleHabitCompletion(habitId);
                    }
                });
            });
        }

        function generateTrackerGrid(habit) {
            const grid = document.createElement('div');
            grid.className = 'tracker-grid';
            
            // Generate cells for the last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateKey = date.toDateString();
                
                const isCompleted = habit.history[dateKey] === true;
                const isToday = dateKey === today;
                
                const cell = document.createElement('div');
                cell.className = `day-cell ${isCompleted ? 'completed' : 'pending'} ${isToday ? 'today' : ''}`;
                cell.dataset.date = dateKey;
                
                // Add a click listener to toggle completion
                cell.addEventListener('click', () => toggleHabitCompletion(habit.id));

                grid.appendChild(cell);
            }
            return grid.outerHTML;
        }

        // --- Initialization ---

        document.addEventListener('DOMContentLoaded', () => {
            // Set the input field to the current date for convenience (optional)
            document.getElementById('new-habit-name').value = ''; 
            
            renderHabits();
        });

        document.getElementById('add-habit-btn').addEventListener('click', addHabit);
        document.getElementById('new-habit-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addHabit();
            }
        });

    </script>
</body>
</html>
```