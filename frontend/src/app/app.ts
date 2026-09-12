import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Shift {
  id: number;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
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

  form = {
    employeeName: '',
    date: '',
    startTime: '',
    endTime: '',
  };

  totalShifts = computed(() => this.shifts().length);

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
