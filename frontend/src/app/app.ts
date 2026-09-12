import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Shift {
    id: string;
    userId: string;
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

interface EmployeeSummary {
    employeeName: string;
    workedMinutes: number;
    overtimeMinutes: number;
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
    showTimesheet = signal(false);

    adminFilters = {
        date: '',
        employeeName: '',
        sort: 'employee',
    };

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
    totalWorkedMinutes = computed(() =>
        this.shifts().reduce((total, shift) => total + this.getShiftMinutes(shift), 0),
    );
    totalOvertimeMinutes = computed(() => {
        const minutesByEmployeeAndDate = new Map<string, number>();

        for (const shift of this.shifts()) {
            const key = `${shift.userId}:${shift.date}`;
            const minutes = minutesByEmployeeAndDate.get(key) ?? 0;
            minutesByEmployeeAndDate.set(key, minutes + this.getShiftMinutes(shift));
        }

        return [...minutesByEmployeeAndDate.values()].reduce(
            (total, minutes) => total + Math.max(0, minutes - 8 * 60),
            0,
        );
    });
    employeeUsers = computed(() =>
        this.users()
            .filter((user) => user.role === 'employee')
            .sort((first, second) => first.name.localeCompare(second.name)),
    );
    employeeSummaries = computed<EmployeeSummary[]>(() => {
        const byEmployeeAndDate = new Map<string, { userId: string; employeeName: string; minutes: number }>();

        const summaries = new Map<string, EmployeeSummary>();
        for (const employee of this.employeeUsers()) {
            if (this.adminFilters.employeeName && employee.name !== this.adminFilters.employeeName) {
                continue;
            }

            summaries.set(employee.id, {
                employeeName: employee.name,
                workedMinutes: 0,
                overtimeMinutes: 0,
            });
        }

        for (const shift of this.shifts()) {
            const key = `${shift.userId}:${shift.date}`;
            const current = byEmployeeAndDate.get(key) ?? {
                userId: shift.userId,
                employeeName: shift.employeeName,
                minutes: 0,
            };
            current.minutes += this.getShiftMinutes(shift);
            byEmployeeAndDate.set(key, current);
        }

        for (const dailyTotal of byEmployeeAndDate.values()) {
            const summary = summaries.get(dailyTotal.userId);
            if (!summary) {
                continue;
            }

            summary.workedMinutes += dailyTotal.minutes;
            summary.overtimeMinutes += Math.max(0, dailyTotal.minutes - 8 * 60);
        }

        return [...summaries.values()].sort((first, second) =>
            first.employeeName.localeCompare(second.employeeName),
        );
    });

    constructor() {
        this.loadUsers();
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
        const user = this.activeUser();
        if (!user) {
            return;
        }

        try {
            const query = new URLSearchParams({
                userId: user.id,
                role: user.role,
            });

            if (user.role === 'admin') {
                if (this.adminFilters.date) {
                    query.set('date', this.adminFilters.date);
                }
                if (this.adminFilters.employeeName) {
                    query.set('employeeName', this.adminFilters.employeeName);
                }
                query.set('sort', this.adminFilters.sort);
            }

            const response = await fetch(
                `${API_URL}/shifts?${query.toString()}`,
            );
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

    private getShiftMinutes(shift: Shift): number {
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = shift.endTime.split(':').map(Number);
        const start = startHour * 60 + startMinute;
        let end = endHour * 60 + endMinute;

        if (end < start) {
            end += 24 * 60;
        }

        return end - start;
    }

    formatMinutes(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}min`;
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
        this.showTimesheet.set(false);
        this.shifts.set([]);
    }

    async saveShift(): Promise<void> {
        const user = this.activeUser();
        const employeeName = user?.name ?? '';
        const { date, startTime, endTime } = this.form;

        if (!user || !date || !startTime || !endTime) {
            alert('Please complete all shift fields before saving.');
            return;
        }

        try {
            const endpoint = this.editingId ? `${API_URL}/shifts/${this.editingId}` : `${API_URL}/shifts`;
            const method = this.editingId ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, employeeName, date, startTime, endTime }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Failed to save shift.');
                return;
            }

            if (this.showTimesheet()) {
                await this.loadShifts();
            }
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

    async toggleTimesheet(): Promise<void> {
        const shouldShow = !this.showTimesheet();
        this.showTimesheet.set(shouldShow);

        if (shouldShow) {
            await this.loadShifts();
        } else {
            this.shifts.set([]);
        }
    }

    async applyAdminFilters(): Promise<void> {
        if (this.showTimesheet()) {
            await this.loadShifts();
        }
    }

    async clearAdminFilters(): Promise<void> {
        this.adminFilters = {
            date: '',
            employeeName: '',
            sort: 'employee',
        };

        if (this.showTimesheet()) {
            await this.loadShifts();
        }
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
