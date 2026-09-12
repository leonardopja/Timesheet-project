import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Shift {
    id: string;
    employeeName: string;
    date: string;
    startTime: string;
    endTime: string;
}

interface User {
    id: string;
    name: string;
    username: string;
    password: string;
    role: 'admin' | 'employee';
}

const API_URL = 'http://localhost:3000/api';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    users = signal<User[]>([]);

    activeUser = signal<User | null>(null);
    authMode = signal<'login' | 'register'>('login');

    shifts = signal<Shift[]>([]);

    editingId: string | null = null;

    loginForm = {
        username: '',
        password: '',
    };

    registerForm = {
        name: '',
        username: '',
        password: '',
    };

    form = {
        employeeName: '',
        date: '',
        startTime: '',
        endTime: '',
    };

    totalShifts = computed(() => this.shifts().length);
    isBoss = computed(() => this.activeUser()?.role === 'admin');
    welcomeName = computed(() => this.activeUser()?.name ?? 'User');

    constructor() {
        this.loadUsers();
        this.loadShifts();
    }

    private async loadUsers(): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/users`);
            if (!response.ok) {
                throw new Error('Unable to load users.');
            }

            const users = (await response.json()) as User[];
            this.users.set(users);
        } catch (error) {
            console.error('Failed to load users:', error);
            this.users.set([]);
        }
    }

    private async loadShifts(): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/shifts`);
            if (!response.ok) {
                throw new Error('Unable to load shifts.');
            }

            const shifts = (await response.json()) as Shift[];
            this.shifts.set(shifts);
        } catch (error) {
            console.error('Failed to load shifts:', error);
            this.shifts.set([]);
        }
    }

    async login(): Promise<void> {
        const { username, password } = this.loginForm;

        if (!username || !password) {
            alert('Please enter your username and password.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Invalid username or password.');
                return;
            }

            this.activeUser.set(data.user as User);
            this.loginForm = { username: '', password: '' };
            await this.loadUsers();
        } catch (error) {
            console.error('Login failed:', error);
            alert('Could not connect to the server.');
        }
    }

    async register(): Promise<void> {
        const { name, username, password } = this.registerForm;

        if (!name || !username || !password) {
            alert('Please complete all registration fields.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Unable to create the account.');
                return;
            }

            this.activeUser.set(data.user as User);
            this.registerForm = { name: '', username: '', password: '' };
            this.authMode.set('login');
            await this.loadUsers();
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Could not connect to the server.');
        }
    }

    logout(): void {
        this.activeUser.set(null);
    }

    async saveShift(): Promise<void> {
        const { employeeName, date, startTime, endTime } = this.form;

        if (!employeeName || !date || !startTime || !endTime) {
            alert('Please complete all shift fields before saving.');
            return;
        }

        try {
            const endpoint = this.editingId ? `${API_URL}/shifts/${this.editingId}` : `${API_URL}/shifts`;
            const method = this.editingId ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeName, date, startTime, endTime }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Failed to save shift.');
                return;
            }

            await this.loadShifts();
            this.resetForm();
        } catch (error) {
            console.error('Shift save failed:', error);
            alert('Could not save the shift to the server.');
        }
    }

    editShift(shift: Shift): void {
        this.editingId = shift.id;
        this.form = {
            employeeName: shift.employeeName,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
        };
    }

    async deleteShift(id: string): Promise<void> {
        if (!this.isBoss()) {
            alert('Only the boss can remove a shift.');
            return;
        }

        const confirmed = window.confirm('Are you sure you want to delete this shift?');

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/shifts/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Failed to delete shift.');
                return;
            }

            await this.loadShifts();

            if (this.editingId === id) {
                this.resetForm();
            }
        } catch (error) {
            console.error('Shift delete failed:', error);
            alert('Could not delete the shift from the server.');
        }
    }

    resetForm(): void {
        this.form = {
            employeeName: '',
            date: '',
            startTime: '',
            endTime: '',
        };
        this.editingId = null;
    }
}
