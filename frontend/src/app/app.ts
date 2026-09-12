import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Shift {
  id: number;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface User {
  id: number;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'employee';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  users = signal<User[]>([
    {
      id: 1,
      name: 'Admin',
      username: 'user',
      password: 'password',
      role: 'admin',
    },
  ]);

  activeUser = signal<User | null>(null);
  authMode = signal<'login' | 'register'>('login');

  shifts = signal<Shift[]>([
    {
      id: 1,
      employeeName: 'Ana Silva',
      date: '2026-09-12',
      startTime: '08:00',
      endTime: '12:00',
    },
    {
      id: 2,
      employeeName: 'Carlos Mendonça',
      date: '2026-09-13',
      startTime: '13:00',
      endTime: '18:00',
    },
  ]);

  editingId: number | null = null;

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

  login(): void {
    const { username, password } = this.loginForm;

    if (!username || !password) {
      alert('Please enter your username and password.');
      return;
    }

    const match = this.users().find(
      (user) => user.username === username && user.password === password,
    );

    if (!match) {
      alert('Invalid username or password.');
      return;
    }

    this.activeUser.set(match);
    this.loginForm = { username: '', password: '' };
  }

  register(): void {
    const { name, username, password } = this.registerForm;

    if (!name || !username || !password) {
      alert('Please complete all registration fields.');
      return;
    }

    const userExists = this.users().some((user) => user.username === username);

    if (userExists) {
      alert('This user already exists. Please choose another username.');
      return;
    }

    const newUser: User = {
      id: Date.now(),
      name,
      username,
      password,
      role: 'employee',
    };

    this.users.update((items) => [...items, newUser]);
    this.activeUser.set(newUser);
    this.registerForm = { name: '', username: '', password: '' };
    this.authMode.set('login');
  }

  logout(): void {
    this.activeUser.set(null);
  }

  saveShift(): void {
    const { employeeName, date, startTime, endTime } = this.form;

    if (!employeeName || !date || !startTime || !endTime) {
      alert('Please complete all shift fields before saving.');
      return;
    }

    if (this.editingId !== null) {
      this.shifts.update((items) =>
        items.map((shift) =>
          shift.id === this.editingId
            ? { ...shift, employeeName, date, startTime, endTime }
            : shift,
        ),
      );
    } else {
      this.shifts.update((items) => [
        ...items,
        {
          id: Date.now(),
          employeeName,
          date,
          startTime,
          endTime,
        },
      ]);
    }

    this.resetForm();
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

  deleteShift(id: number): void {
    if (!this.isBoss()) {
      alert('Only the boss can remove a shift.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this shift?');

    if (!confirmed) {
      return;
    }

    this.shifts.update((items) => items.filter((shift) => shift.id !== id));

    if (this.editingId === id) {
      this.resetForm();
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
