class TaskTracker {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentTaskId = null;
        this.availableColors = ['crimson', 'orange', 'blue', 'teal', 'black'];
        this.selectedColor = this.availableColors[0];
        this.draggedItem = null;
        this.touchStartY = 0;
        this.initializeElements();
        this.addEventListeners();
        this.loadTasks();
    }

    initializeElements() {
        this.dateSelector = document.getElementById('dateSelector');
        this.taskInput = document.getElementById('taskInput');
        this.taskList = document.getElementById('taskList');
        this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
        this.modalTaskText = document.getElementById('modalTaskText');
        this.modalTaskDescription = document.getElementById('modalTaskDescription');
        this.modalTaskTime = document.getElementById('modalTaskTime');
        this.colorPicker = document.querySelector('.color-picker');
        this.dateSelector.value = this.currentDate;
        this.initializeColorPicker();
    }

    initializeColorPicker() {
        this.colorPicker?.querySelectorAll('.color-circle').forEach(circle => {
            circle.addEventListener('click', () => {
                this.selectColor(circle.dataset.color);
            });
        });
    }

    selectColor(color) {
        this.selectedColor = color;
        this.colorPicker?.querySelectorAll('.color-circle').forEach(circle => {
            circle.classList.toggle('selected', circle.dataset.color === color);
        });
    }

    addEventListeners() {
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.taskInput.value.trim()) {
                this.addTask(this.taskInput.value.trim());
                this.taskInput.value = '';
            }
        });

        this.dateSelector.addEventListener('change', () => {
            this.loadTasks();
        });

        document.getElementById('saveTask').addEventListener('click', () => {
            this.saveTaskChanges();
        });

        document.getElementById('deleteTask').addEventListener('click', () => {
            this.deleteTask();
        });
    }

    addTask(text) {
        const tasks = this.getTasks();
        const newTask = {
            id: Date.now(),
            text,
            description: '',
            time: '',
            color: '#000000',
            completed: false,
            order: tasks.length
        };
        tasks.push(newTask);
        this.saveTasks(tasks);
        this.renderTasks();
    }

    getTasks() {
        const date = this.dateSelector.value;
        return JSON.parse(localStorage.getItem(`tasks_${date}`) || '[]');
    }

    saveTasks(tasks) {
        const date = this.dateSelector.value;
        localStorage.setItem(`tasks_${date}`, JSON.stringify(tasks));
    }

    loadTasks() {
        this.renderTasks();
    }

    renderTasks() {
        const tasks = this.getTasks();
        this.taskList.innerHTML = '';

        tasks.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(task => {
            const li = document.createElement('li');
            li.className = 'list-group-item task-item';
            li.draggable = true;
            li.dataset.taskId = task.id;
            
            const taskContent = document.createElement('div');
            taskContent.className = 'task-content';
            
            const taskMain = document.createElement('div');
            taskMain.className = 'task-main';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => this.toggleTask(task.id));

            const taskTextWrapper = document.createElement('div');
            taskTextWrapper.className = 'task-text-wrapper';

            const taskText = document.createElement('span');
            taskText.className = 'task-text';
            taskText.textContent = task.text;
            taskText.style.color = task.color;
            if (task.completed) {
                taskText.classList.add('completed-task');
            }
            taskText.addEventListener('click', () => this.openTaskModal(task));

            if (task.time) {
                const taskTime = document.createElement('div');
                taskTime.className = 'task-time';
                taskTime.textContent = task.time;
                taskTextWrapper.appendChild(taskTime);
            }

            const dragHandle = document.createElement('span');
            dragHandle.className = 'task-drag-handle';
            dragHandle.innerHTML = '☰';

            // Добавляем обработчики для сенсорных событий
            dragHandle.addEventListener('touchstart', (e) => this.handleTouchStart(e, li), { passive: false });
            dragHandle.addEventListener('touchmove', (e) => this.handleTouchMove(e, li), { passive: false });
            dragHandle.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

            taskTextWrapper.insertBefore(taskText, taskTextWrapper.firstChild);
            taskMain.appendChild(checkbox);
            taskMain.appendChild(taskTextWrapper);
            taskContent.appendChild(taskMain);
            li.appendChild(taskContent);
            li.appendChild(dragHandle);

            li.addEventListener('dragstart', this.handleDragStart.bind(this));
            li.addEventListener('dragend', this.handleDragEnd.bind(this));
            li.addEventListener('dragover', this.handleDragOver.bind(this));
            li.addEventListener('drop', this.handleDrop.bind(this));

            this.taskList.appendChild(li);
        });
    }

    handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        const draggingElement = this.taskList.querySelector('.dragging');
        const currentElement = e.currentTarget;
        
        if (draggingElement !== currentElement) {
            const rect = currentElement.getBoundingClientRect();
            const offset = e.clientY - rect.top - rect.height / 2;
            
            if (offset < 0) {
                currentElement.parentNode.insertBefore(draggingElement, currentElement);
            } else {
                currentElement.parentNode.insertBefore(draggingElement, currentElement.nextSibling);
            }
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const tasks = this.getTasks();
        const newOrder = Array.from(this.taskList.children).map(item => {
            const task = tasks.find(t => t.id === parseInt(item.dataset.taskId));
            return task;
        });
        
        newOrder.forEach((task, index) => {
            task.order = index;
        });
        
        this.saveTasks(newOrder);
    }

    handleTouchStart(e, item) {
        e.preventDefault();
        this.draggedItem = item;
        this.touchStartY = e.touches[0].clientY;
        this.draggedItem.classList.add('dragging');
        this.initialY = this.touchStartY - item.offsetTop;
    }

    handleTouchMove(e, item) {
        if (!this.draggedItem) return;
        e.preventDefault();

        const touch = e.touches[0];
        const currentY = touch.clientY;

        const elements = document.elementsFromPoint(touch.clientX, currentY);
        const taskItem = elements.find(el => el.classList.contains('task-item') && el !== this.draggedItem);

        if (taskItem) {
            const rect = taskItem.getBoundingClientRect();
            const middle = rect.top + rect.height / 2;

            if (currentY < middle && taskItem.previousElementSibling === this.draggedItem) {
                return;
            }
            if (currentY > middle && taskItem.nextElementSibling === this.draggedItem) {
                return;
            }

            if (currentY < middle) {
                taskItem.parentNode.insertBefore(this.draggedItem, taskItem);
            } else {
                taskItem.parentNode.insertBefore(this.draggedItem, taskItem.nextElementSibling);
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.draggedItem) return;
        e.preventDefault();

        this.draggedItem.classList.remove('dragging');
        
        const tasks = this.getTasks();
        const newOrder = Array.from(this.taskList.children).map(item => {
            const task = tasks.find(t => t.id === parseInt(item.dataset.taskId));
            return task;
        });
        
        newOrder.forEach((task, index) => {
            task.order = index;
        });
        
        this.saveTasks(newOrder);
        this.draggedItem = null;
    }

    toggleTask(taskId) {
        const tasks = this.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks(tasks);
            this.renderTasks();
        }
    }

    openTaskModal(task) {
        this.currentTaskId = task.id;
        this.modalTaskText.value = task.text;
        this.modalTaskDescription.value = task.description;
        this.modalTaskTime.value = task.time;
        this.selectColor(task.color);
        this.taskModal.show();
    }

    saveTaskChanges() {
        const tasks = this.getTasks();
        const task = tasks.find(t => t.id === this.currentTaskId);
        if (task) {
            task.text = this.modalTaskText.value;
            task.description = this.modalTaskDescription.value;
            task.time = this.modalTaskTime.value;
            task.color = this.selectedColor;
            this.saveTasks(tasks);
            this.taskModal.hide();
            this.renderTasks();
        }
    }

    deleteTask() {
        const tasks = this.getTasks();
        const updatedTasks = tasks.filter(t => t.id !== this.currentTaskId);
        updatedTasks.forEach((task, index) => {
            task.order = index;
        });
        this.saveTasks(updatedTasks);
        this.taskModal.hide();
        this.renderTasks();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TaskTracker();
});
