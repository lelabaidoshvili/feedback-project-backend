const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    // ჯერ ვამოწმებთ ქუქიში ხომ არ გვაქვს ტოკენი, თუ არადა ჰედერიდან ვიღებთ (მაგ. Swagger-ისთვის)
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'ავტორიზაცია სავალდებულოა' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_here');
        req.user = decoded; // { id, email }
        next();
    } catch (err) {
        return res.status(401).json({ message: 'არასწორი ან ვადაგასული ტოკენი' });
    }
};

module.exports = { authenticate };
