const express = require('express');
const router = express.Router();
const { 
    createProject, getProjects, editProject, deleteProject, 
    addMemberToProject, getMembers, editMember, removeMember 
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: პროექტების მართვა
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: პროექტების სიის წამოღება (სადაც იუზერი წევრია)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: პროექტების სია
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   status:
 *                     type: string
 *                   ownerId:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *             example:
 *               - id: 1
 *                 name: "პროექტი A"
 *                 description: "პროექტის აღწერა"
 *                 status: "active"
 *                 ownerId: 1
 *                 createdAt: "2026-09-04T12:00:00Z"
 *   post:
 *     summary: ახალი პროექტის შექმნა
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: წარმატებით შეიქმნა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 projectId:
 *                   type: integer
 *             example:
 *               message: "პროექტი წარმატებით შეიქმნა"
 *               projectId: 1
 */
router.route('/')
    .get(authenticate, getProjects)
    .post(authenticate, createProject);

/**
 * @swagger
 * /api/projects/{projectId}:
 *   put:
 *     summary: პროექტის რედაქტირება (მხოლოდ owner)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: წარმატებით განახლდა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "პროექტი წარმატებით განახლდა"
 *   delete:
 *     summary: პროექტის წაშლა (მხოლოდ owner)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: წარმატებით წაიშალა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "პროექტი წარმატებით წაიშალა"
 */
router.route('/:projectId')
    .put(authenticate, editProject)
    .delete(authenticate, deleteProject);

/**
 * @swagger
 * /api/projects/{projectId}/members:
 *   get:
 *     summary: პროექტის წევრების სია
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: წევრების სია
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *                   position:
 *                     type: string
 *                   addedAt:
 *                     type: string
 *                     format: date-time
 *             example:
 *               - id: 2
 *                 firstName: "ნინო"
 *                 lastName: "ბერიძე"
 *                 email: "nino@example.com"
 *                 role: "member"
 *                 position: "Developer"
 *                 addedAt: "2026-09-04T12:00:00Z"
 *   post:
 *     summary: პროექტში მომხმარებლის დამატება
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               position:
 *                 type: string
 *                 description: წევრის თანამდებობა (მაგ. დეველოპერი, ტესტერი)
 *     responses:
 *       200:
 *         description: მომხმარებელი დაემატა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "მომხმარებელი წარმატებით დაემატა პროექტს"
 */
router.route('/:projectId/members')
    .get(authenticate, getMembers)
    .post(authenticate, addMemberToProject);

/**
 * @swagger
 * /api/projects/{projectId}/members/{userId}:
 *   put:
 *     summary: წევრის როლის/თანამდებობის რედაქტირება
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               position:
 *                 type: string
 *                 description: თანამდებობა
 *     responses:
 *       200:
 *         description: მონაცემები განახლდა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "მომხმარებლის მონაცემები პროექტში განახლდა"
 *   delete:
 *     summary: წევრის პროექტიდან წაშლა
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: წევრი წაიშალა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "მომხმარებელი წარმატებით წაიშალა პროექტიდან"
 */
router.route('/:projectId/members/:userId')
    .put(authenticate, editMember)
    .delete(authenticate, removeMember);

module.exports = router;
