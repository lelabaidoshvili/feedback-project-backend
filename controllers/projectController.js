const db = require('../database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// 1. პროექტის შექმნა
const createProject = (req, res) => {
    const { name, description, status } = req.body;
    const ownerId = req.user.id; 

    if (!name) {
        return res.status(400).json({ message: 'პროექტის სახელი სავალდებულოა' });
    }

    db.run(
        'INSERT INTO projects (name, description, status, ownerId) VALUES (?, ?, ?, ?)',
        [name, description || null, status || 'active', ownerId],
        function (err) {
            if (err) return res.status(500).json({ message: 'შეცდომა პროექტის შექმნისას' });
            
            const projectId = this.lastID;
            
            db.run(
                'INSERT INTO project_members (projectId, userId, role, position) VALUES (?, ?, ?, ?)',
                [projectId, ownerId, 'owner', 'Owner / Admin'],
                (err2) => {
                    if (err2) return res.status(500).json({ message: 'შეცდომა მფლობელის დამატებისას' });
                    res.status(201).json({ message: 'პროექტი წარმატებით შეიქმნა', projectId });
                }
            );
        }
    );
};

// 2. პროექტების წამოღება (სადაც იუზერი წევრია)
const getProjects = (req, res) => {
    const userId = req.user.id;
    const query = `
        SELECT p.*, pm.role, pm.position
        FROM projects p
        JOIN project_members pm ON p.id = pm.projectId
        WHERE pm.userId = ?
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        res.status(200).json(rows);
    });
};

// 3. პროექტის რედაქტირება
const editProject = (req, res) => {
    const { projectId } = req.params;
    const { name, description, status } = req.body;
    
    db.get('SELECT ownerId FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        if (!project) return res.status(404).json({ message: 'პროექტი არ მოიძებნა' });
        if (project.ownerId !== req.user.id) return res.status(403).json({ message: 'თქვენ არ გაქვთ რედაქტირების უფლება' });
        
        db.run(
            'UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ?',
            [name, description, status, projectId],
            function(err) {
                if (err) return res.status(500).json({ message: 'შეცდომა განახლებისას' });
                res.status(200).json({ message: 'პროექტი წარმატებით განახლდა' });
            }
        );
    });
};

// 4. პროექტის წაშლა
const deleteProject = (req, res) => {
    const { projectId } = req.params;
    
    db.get('SELECT ownerId FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        if (!project) return res.status(404).json({ message: 'პროექტი არ მოიძებნა' });
        if (project.ownerId !== req.user.id) return res.status(403).json({ message: 'თქვენ არ გაქვთ წაშლის უფლება' });

        db.run('DELETE FROM project_members WHERE projectId = ?', [projectId], (err) => {
            if (err) return res.status(500).json({ message: 'შეცდომა წევრების წაშლისას' });
            db.run('DELETE FROM projects WHERE id = ?', [projectId], (err) => {
                if (err) return res.status(500).json({ message: 'შეცდომა პროექტის წაშლისას' });
                res.status(200).json({ message: 'პროექტი წარმატებით წაიშალა' });
            });
        });
    });
};

// 5. წევრის დამატება
const addMemberToProject = (req, res) => {
    const { projectId } = req.params;
    const { email, firstName, lastName, position } = req.body;

    if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: 'ელ. ფოსტა, სახელი და გვარი სავალდებულოა' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });

        if (user) {
            addToMembers(projectId, user.id, res, false, null, position);
        } else {
            const generatedPassword = crypto.randomBytes(4).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(generatedPassword, salt);

            db.run(
                'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
                [firstName, lastName, email, hashedPassword],
                function (err2) {
                    if (err2) return res.status(500).json({ message: 'რეგისტრაციის შეცდომა' });
                    addToMembers(projectId, this.lastID, res, true, generatedPassword, position);
                }
            );
        }
    });
};

const addToMembers = (projectId, userId, res, isNewUser, generatedPassword, position) => {
    db.run(
        'INSERT INTO project_members (projectId, userId, role, position) VALUES (?, ?, ?, ?)',
        [projectId, userId, 'member', position || null],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ message: 'ეს მომხმარებელი უკვე არის ამ პროექტში' });
                }
                return res.status(500).json({ message: 'შეცდომა დამატებისას' });
            }

            let responseObj = { message: 'მომხმარებელი დაემატა პროექტს' };
            if (isNewUser) {
                responseObj.note = 'მომხმარებელი ავტომატურად დარეგისტრირდა';
                responseObj.generatedPassword = generatedPassword;
            }
            res.status(200).json(responseObj);
        }
    );
};

// 6. პროექტის წევრების წამოღება
const getMembers = (req, res) => {
    const { projectId } = req.params;
    const query = `
        SELECT u.id, u.firstName, u.lastName, u.email, pm.role, pm.position, pm.addedAt
        FROM users u
        JOIN project_members pm ON u.id = pm.userId
        WHERE pm.projectId = ?
    `;
    db.all(query, [projectId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        res.status(200).json(rows);
    });
};

// 7. პროექტის წევრის რედაქტირება
const editMember = (req, res) => {
    const { projectId, userId } = req.params;
    const { role, position, email, firstName, lastName } = req.body;
    
    db.get('SELECT ownerId FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        if (!project) return res.status(404).json({ message: 'პროექტი არ მოიძებნა' });
        if (project.ownerId !== req.user.id) return res.status(403).json({ message: 'უფლება არ გაქვთ' });

        db.run(
            'UPDATE project_members SET role = COALESCE(?, role), position = COALESCE(?, position) WHERE projectId = ? AND userId = ?',
            [role, position, projectId, userId],
            function(err) {
                if (err) return res.status(500).json({ message: 'შეცდომა განახლებისას' });
                if (this.changes === 0) return res.status(404).json({ message: 'წევრი არ მოიძებნა' });
                
                if (email || firstName || lastName) {
                    db.run(
                        'UPDATE users SET email = COALESCE(?, email), firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName) WHERE id = ?',
                        [email, firstName, lastName, userId],
                        function(err2) {
                            if (err2) return res.status(500).json({ message: 'შეცდომა მომხმარებლის განახლებისას' });
                            res.status(200).json({ message: 'წევრის მონაცემები განახლდა' });
                        }
                    );
                } else {
                    res.status(200).json({ message: 'წევრის მონაცემები განახლდა' });
                }
            }
        );
    });
};

// 8. წევრის წაშლა
const removeMember = (req, res) => {
    const { projectId, userId } = req.params;

    db.get('SELECT ownerId FROM projects WHERE id = ?', [projectId], (err, project) => {
        if (err) return res.status(500).json({ message: 'სერვერის შეცდომა' });
        if (!project) return res.status(404).json({ message: 'პროექტი არ მოიძებნა' });
        
        if (project.ownerId !== req.user.id && parseInt(userId) !== req.user.id) {
            return res.status(403).json({ message: 'უფლება არ გაქვთ' });
        }

        if (project.ownerId === parseInt(userId)) {
            return res.status(400).json({ message: 'მფლობელის წაშლა შეუძლებელია' });
        }

        db.run(
            'DELETE FROM project_members WHERE projectId = ? AND userId = ?',
            [projectId, userId],
            function(err) {
                if (err) return res.status(500).json({ message: 'შეცდომა წაშლისას' });
                if (this.changes === 0) return res.status(404).json({ message: 'წევრი არ მოიძებნა' });
                res.status(200).json({ message: 'წევრი წარმატებით წაიშალა' });
            }
        );
    });
};

module.exports = { 
    createProject, getProjects, editProject, deleteProject, 
    addMemberToProject, getMembers, editMember, removeMember 
};
