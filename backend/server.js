const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    },
    { timestamps: true },
);

const shiftSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        employeeName: { type: String, required: true },
        date: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
    },
    { timestamps: true },
);

const User = mongoose.model('User', userSchema);
const Shift = mongoose.model('Shift', shiftSchema);

const serializeUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    password: user.password,
    role: user.role,
});

const serializeShift = (shift) => ({
    id: shift._id.toString(),
    userId: shift.userId,
    employeeName: shift.employeeName,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
});

async function ensureDefaultAdmin() {
    const adminUser = await User.findOne({ username: 'user' });

    if (!adminUser) {
        await User.create({
            name: 'Admin',
            username: 'user',
            password: 'password',
            role: 'admin',
        });
    }
}

async function connectMongo() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME || 'timesheetDB',
        });
        console.log('MongoDB Atlas connected successfully.');
        await ensureDefaultAdmin();
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, message: 'Timesheet API is running.' });
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: 1 });
        res.json(users.map(serializeUser));
    } catch (error) {
        res.status(500).json({ message: 'Unable to fetch users.', error: error.message });
    }
});

app.post('/api/users/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        let user = await User.findOne({ username });

        if (!user && username === 'user' && password === 'password') {
            user = await User.create({
                name: 'Admin',
                username: 'user',
                password: 'password',
                role: 'admin',
            });
        }

        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        return res.json({ user: serializeUser(user) });
    } catch (error) {
        return res.status(500).json({ message: 'Login failed.', error: error.message });
    }
});

app.post('/api/users/register', async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ message: 'Name, username and password are required.' });
    }

    try {
        const exists = await User.findOne({ username });
        if (exists) {
            return res.status(409).json({ message: 'This username is already in use.' });
        }

        const user = await User.create({
            name,
            username,
            password,
            role: 'employee',
        });

        return res.status(201).json({ user: serializeUser(user) });
    } catch (error) {
        return res.status(500).json({ message: 'Registration failed.', error: error.message });
    }
});

app.get('/api/shifts', async (req, res) => {
    const { userId, role } = req.query;

    if (!userId || !role) {
        return res.status(400).json({ message: 'User information is required.' });
    }

    try {
        const filter = role === 'admin' ? {} : { userId };
        const shifts = await Shift.find(filter).sort({ createdAt: 1 });
        res.json(shifts.map(serializeShift));
    } catch (error) {
        res.status(500).json({ message: 'Unable to fetch shifts.', error: error.message });
    }
});

app.post('/api/shifts', async (req, res) => {
    const { userId, employeeName, date, startTime, endTime } = req.body;

    if (!userId || !employeeName || !date || !startTime || !endTime) {
        return res.status(400).json({ message: 'Complete all shift fields before saving.' });
    }

    try {
        const shift = await Shift.create({ userId, employeeName, date, startTime, endTime });
        return res.status(201).json({ shift: serializeShift(shift) });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to create shift.', error: error.message });
    }
});

app.put('/api/shifts/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, employeeName, date, startTime, endTime } = req.body;

    try {
        const updatedShift = await Shift.findByIdAndUpdate(
            id,
            { userId, employeeName, date, startTime, endTime },
            { new: true },
        );

        if (!updatedShift) {
            return res.status(404).json({ message: 'Shift not found.' });
        }

        return res.json({ shift: serializeShift(updatedShift) });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to update shift.', error: error.message });
    }
});

app.delete('/api/shifts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedShift = await Shift.findByIdAndDelete(id);

        if (!deletedShift) {
            return res.status(404).json({ message: 'Shift not found.' });
        }

        return res.json({ message: 'Shift deleted successfully.' });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to delete shift.', error: error.message });
    }
});

connectMongo();

app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
