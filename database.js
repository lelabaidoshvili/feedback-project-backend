const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('ბაზასთან დაკავშირების შეცდომა:', err.message);
    } else {
        console.log('წარმატებით დაუკავშირდა SQLite ბაზას.');
        
        db.run('PRAGMA foreign_keys = ON');

        // მომხმარებლები
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

        // პროექტები
        db.run(`CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            ownerId INTEGER NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerId) REFERENCES users (id)
        )`);

        // პროექტის წევრები (position დამატებულია)
        db.run(`CREATE TABLE IF NOT EXISTS project_members (
            projectId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            role TEXT DEFAULT 'member',
            position TEXT,
            addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (projectId, userId),
            FOREIGN KEY (projectId) REFERENCES projects (id),
            FOREIGN KEY (userId) REFERENCES users (id)
        )`, () => {
            // თუ ცხრილი უკვე არსებობს და position სვეტი არ აქვს, დავამატებთ. (უსაფრთხოების მიზნით ვაიგნორებთ შეცდომას თუ უკვე დამატებულია)
            db.run("ALTER TABLE project_members ADD COLUMN position TEXT", (e) => {});
        });

        // ------------------ ფიდბექის ცხრილები ------------------

        db.run(`CREATE TABLE IF NOT EXISTS questionnaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectId INTEGER NOT NULL,
            title TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            questionnaireId INTEGER NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY (questionnaireId) REFERENCES questionnaires (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS question_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            questionId INTEGER NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY (questionId) REFERENCES questions (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            questionnaireId INTEGER NOT NULL,
            evaluatorId INTEGER NOT NULL,
            evaluateeId INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            completedAt DATETIME,
            FOREIGN KEY (questionnaireId) REFERENCES questionnaires (id) ON DELETE CASCADE,
            FOREIGN KEY (evaluatorId) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (evaluateeId) REFERENCES users (id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            evaluationId INTEGER NOT NULL,
            questionId INTEGER NOT NULL,
            optionId INTEGER NOT NULL,
            FOREIGN KEY (evaluationId) REFERENCES evaluations (id) ON DELETE CASCADE,
            FOREIGN KEY (questionId) REFERENCES questions (id) ON DELETE CASCADE,
            FOREIGN KEY (optionId) REFERENCES question_options (id) ON DELETE CASCADE
        )`);
    }
});

module.exports = db;
