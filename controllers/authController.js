const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

// რეგისტრაცია
const register = async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // შემოწმება: ყველა ველი შევსებულია თუ არა
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'ყველა ველი სავალდებულოა' });
    }

    // შემოწმება: ემთხვევა თუ არა პაროლები
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'პაროლები არ ემთხვევა' });
    }

    try {
        // ვამოწმებთ, არსებობს თუ არა უკვე მომხმარებელი ამ იმეილით
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
            if (row) return res.status(400).json({ message: 'მომხმარებელი ამ იმეილით უკვე არსებობს' });

            // პაროლის ჰეშირება (დაშიფრვა)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // ახალი მომხმარებლის დამატება ბაზაში
            db.run(
                'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
                [firstName, lastName, email, hashedPassword],
                function (err) {
                    if (err) return res.status(500).json({ message: 'შეცდომა რეგისტრაციისას' });
                    res.status(201).json({ message: 'მომხმარებელი წარმატებით დარეგისტრირდა', userId: this.lastID });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: 'სერვერის შეცდომა' });
    }
};

// ლოგინი (ავტორიზაცია)
const login = (req, res) => {
    const { email, password } = req.body;

    // შემოწმება
    if (!email || !password) {
        return res.status(400).json({ message: 'იმეილი და პაროლი სავალდებულოა' });
    }

    // ვეძებთ მომხმარებელს ბაზაში
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        if (!user) return res.status(400).json({ message: 'არასწორი იმეილი ან პაროლი' });

        // პაროლის შემოწმება
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'არასწორი იმეილი ან პაროლი' });

        // ტოკენის გენერაცია
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET || 'supersecretkey', 
            { expiresIn: '1h' }
        );

        // ტოკენის შენახვა ქუქიში (httpOnly)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.json({
            message: 'წარმატებული ავტორიზაცია',
            token, // Keep it for backwards compatibility if needed
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });
    });
};

// მომხმარებლის ინფორმაციის მიღება (დეშბორდისთვის)
const getMe = (req, res) => {
    // req.user შეიცავს { id, email }, რომელსაც authMiddleware გვაწვდის ქუქიდან
    db.get('SELECT id, firstName, lastName, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        if (!user) return res.status(404).json({ message: 'მომხმარებელი არ მოიძებნა' });
        
        res.json({ user });
    });
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, getMe, logout };
