const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegister:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - confirmPassword
 *       properties:
 *         firstName:
 *           type: string
 *           description: მომხმარებლის სახელი
 *         lastName:
 *           type: string
 *           description: მომხმარებლის გვარი
 *         email:
 *           type: string
 *           description: მომხმარებლის ელ. ფოსტა
 *         password:
 *           type: string
 *           description: პაროლი
 *         confirmPassword:
 *           type: string
 *           description: პაროლის გამეორება
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           description: მომხმარებლის ელ. ფოსტა
 *         password:
 *           type: string
 *           description: პაროლი
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: მომხმარებლის რეგისტრაცია
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: წარმატებული რეგისტრაცია
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: integer
 *             example:
 *               message: "მომხმარებელი წარმატებით დარეგისტრირდა"
 *               userId: 1
 *       400:
 *         description: არასწორი მონაცემები ან იმეილი უკვე არსებობს
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "მომხმარებელი ამ იმეილით უკვე არსებობს"
 *       500:
 *         description: სერვერის შეცდომა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "სერვერის შეცდომა"
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: ავტორიზაცია (Login)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: წარმატებული ავტორიზაცია
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *             example:
 *               message: "წარმატებული ავტორიზაცია"
 *               token: "eyJhbGciOiJIUzI1NiIsInR..."
 *               user:
 *                 id: 1
 *                 firstName: "გიორგი"
 *                 lastName: "მაისურაძე"
 *                 email: "giorgi@example.com"
 *       400:
 *         description: არასწორი იმეილი ან პაროლი
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "არასწორი იმეილი ან პაროლი"
 *       500:
 *         description: სერვერის შეცდომა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "სერვერის შეცდომა"
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: მიმდინარე ავტორიზებული მომხმარებლის მიღება
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: წარმატებული მოთხოვნა
 *       401:
 *         description: არ ხართ ავტორიზებული
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (Clears the httpOnly cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Logged out successfully"
 */
router.post('/logout', logout);

module.exports = router;
