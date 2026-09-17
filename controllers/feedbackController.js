const db = require('../database');

// SQLite-ის ასინქრონული ფუნქციები (Promise Wrapper)
const runAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const getAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const allAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// 1. კითხვარის შექმნა (მხოლოდ owner-ისთვის)
const createQuestionnaire = async (req, res) => {
    const { projectId } = req.params;
    const { title, questions } = req.body; // format: { title: '...', questions: [{ text: '..', options: ['A', 'B'] }] }
    
    try {
        const project = await getAsync('SELECT ownerId FROM projects WHERE id = ?', [projectId]);
        if (!project || project.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'მხოლოდ მფლობელს შეუძლია კითხვარის შექმნა' });
        }

        const qResult = await runAsync('INSERT INTO questionnaires (projectId, title) VALUES (?, ?)', [projectId, title]);
        const questionnaireId = qResult.lastID;

        // კითხვების და სავარაუდო პასუხების ჩაწერა
        for (let q of questions) {
            const quResult = await runAsync('INSERT INTO questions (questionnaireId, text) VALUES (?, ?)', [questionnaireId, q.text]);
            const questionId = quResult.lastID;
            
            for (let opt of q.options) {
                await runAsync('INSERT INTO question_options (questionId, text) VALUES (?, ?)', [questionId, opt]);
            }
        }
        res.status(201).json({ message: 'კითხვარი წარმატებით შეიქმნა', questionnaireId });
    } catch (err) {
        res.status(500).json({ message: 'სერვერის შეცდომა', error: err.message });
    }
};

// 2. შემფასებლის დანიშვნა (ვისზე ავსებს)
const assignEvaluation = async (req, res) => {
    const { projectId } = req.params;
    const { questionnaireId, evaluatorId, evaluateeId } = req.body;
    
    try {
        const project = await getAsync('SELECT ownerId FROM projects WHERE id = ?', [projectId]);
        if (!project || project.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'უფლება არ გაქვთ' });
        }
        
        await runAsync(
            'INSERT INTO evaluations (questionnaireId, evaluatorId, evaluateeId) VALUES (?, ?, ?)',
            [questionnaireId, evaluatorId, evaluateeId]
        );
        res.status(201).json({ message: 'შეფასების დავალება წარმატებით გაიგზავნა იუზერთან' });
    } catch (err) {
        res.status(500).json({ message: 'შეცდომა დანიშვნისას', error: err.message });
    }
};

// 3. იუზერისთვის განკუთვნილი კითხვარების სია (რა უნდა შეავსოს)
const getPendingEvaluations = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT e.id as evaluationId, q.title as questionnaireTitle, 
                   u.firstName as evaluateeFirstName, u.lastName as evaluateeLastName,
                   e.questionnaireId
            FROM evaluations e
            JOIN questionnaires q ON e.questionnaireId = q.id
            JOIN users u ON e.evaluateeId = u.id
            WHERE e.evaluatorId = ? AND e.status = 'pending'
        `;
        const evals = await allAsync(query, [userId]);
        res.status(200).json(evals);
    } catch (err) {
        res.status(500).json({ message: 'შეცდომა', error: err.message });
    }
};

// 4. კითხვარის დეტალების წამოღება (შესავსებად)
const getEvaluationDetails = async (req, res) => {
    const { evaluationId } = req.params;
    try {
        const evalRecord = await getAsync('SELECT * FROM evaluations WHERE id = ? AND evaluatorId = ?', [evaluationId, req.user.id]);
        if (!evalRecord) return res.status(404).json({ message: 'დავალება ვერ მოიძებნა ან წვდომა არ გაქვთ' });

        const questions = await allAsync('SELECT id, text FROM questions WHERE questionnaireId = ?', [evalRecord.questionnaireId]);
        for (let q of questions) {
            q.options = await allAsync('SELECT id, text FROM question_options WHERE questionId = ?', [q.id]);
        }
        res.status(200).json({ evaluationId, questions });
    } catch (err) {
        res.status(500).json({ message: 'შეცდომა', error: err.message });
    }
};

// 5. კითხვარის შევსება/გაგზავნა
const submitEvaluation = async (req, res) => {
    const { evaluationId } = req.params;
    const { answers } = req.body; // [ { questionId: 1, optionId: 2 }, ... ]

    try {
        const evalRecord = await getAsync('SELECT * FROM evaluations WHERE id = ? AND evaluatorId = ?', [evaluationId, req.user.id]);
        if (!evalRecord) return res.status(403).json({ message: 'წვდომა არ გაქვთ' });
        if (evalRecord.status === 'completed') return res.status(400).json({ message: 'კითხვარი უკვე შევსებულია' });

        for (let ans of answers) {
            await runAsync(
                'INSERT INTO answers (evaluationId, questionId, optionId) VALUES (?, ?, ?)',
                [evaluationId, ans.questionId, ans.optionId]
            );
        }
        
        await runAsync("UPDATE evaluations SET status = 'completed', completedAt = CURRENT_TIMESTAMP WHERE id = ?", [evaluationId]);
        res.status(200).json({ message: 'კითხვარი წარმატებით გაიგზავნა და შეინახა!' });
    } catch (err) {
        res.status(500).json({ message: 'შეცდომა შევსებისას', error: err.message });
    }
};

// 6. ჩემი შედეგები (ვისაც აფასებდნენ) - ანონიმური, შემფასებლის ვინაობის გარეშე
const getMyResults = async (req, res) => {
    const userId = req.user.id;
    try {
        // არ ვაჯოინებთ evaluator-ს!
        const query = `
            SELECT q.title as questionnaireTitle, 
                   qu.text as question, 
                   qo.text as selectedAnswer,
                   e.completedAt
            FROM evaluations e
            JOIN questionnaires q ON e.questionnaireId = q.id
            JOIN answers a ON a.evaluationId = e.id
            JOIN questions qu ON a.questionId = qu.id
            JOIN question_options qo ON a.optionId = qo.id
            WHERE e.evaluateeId = ? AND e.status = 'completed'
            ORDER BY e.completedAt DESC
        `;
        const results = await allAsync(query, [userId]);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: 'შეცდომა', error: err.message });
    }
};

module.exports = {
    createQuestionnaire,
    assignEvaluation,
    getPendingEvaluations,
    getEvaluationDetails,
    submitEvaluation,
    getMyResults
};
