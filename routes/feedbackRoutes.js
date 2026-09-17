const express = require('express');
const router = express.Router();
const { 
    createQuestionnaire, assignEvaluation, getPendingEvaluations,
    getEvaluationDetails, submitEvaluation, getMyResults
} = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: შეფასებები და კითხვარები
 */

/**
 * @swagger
 * /api/feedback/projects/{projectId}/questionnaires:
 *   post:
 *     summary: კითხვარის შექმნა (მხოლოდ პროექტის Owner)
 *     tags: [Feedback]
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
 *               title:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *             example:
 *               title: "კომუნიკაციის შეფასება"
 *               questions: [
 *                 { text: "როგორია მისი კომუნიკაცია გუნდში?", options: ["კარგი", "საშუალო", "ცუდი"] },
 *                 { text: "ასრულებს თუ არა დავალებებს დროულად?", options: ["კი", "არა", "ნაწილობრივ"] }
 *               ]
 *     responses:
 *       201:
 *         description: კითხვარი შეიქმნა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 questionnaireId:
 *                   type: integer
 *             example:
 *               message: "კითხვარი წარმატებით შეიქმნა"
 *               questionnaireId: 1
 */
router.post('/projects/:projectId/questionnaires', authenticate, createQuestionnaire);

/**
 * @swagger
 * /api/feedback/projects/{projectId}/evaluations:
 *   post:
 *     summary: დავალების მიცემა (ვინ ვინ უნდა შეაფასოს)
 *     tags: [Feedback]
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
 *               questionnaireId:
 *                 type: integer
 *               evaluatorId:
 *                 type: integer
 *                 description: იუზერი ვინც ავსებს (შემფასებელი)
 *               evaluateeId:
 *                 type: integer
 *                 description: იუზერი ვისზეც ავსებენ (შესაფასებელი)
 *     responses:
 *       201:
 *         description: დავალება გაიგზავნა
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "დავალება წარმატებით გაიგზავნა"
 */
router.post('/projects/:projectId/evaluations', authenticate, assignEvaluation);

/**
 * @swagger
 * /api/feedback/my-pending-evaluations:
 *   get:
 *     summary: ჩემთვის დასაწერი შეფასებების სია (რა უნდა შევავსო)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: სია (ჩანს ვისზე ვავსებ)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   evaluationId:
 *                     type: integer
 *                   questionnaireTitle:
 *                     type: string
 *                   evaluateeName:
 *                     type: string
 *                   status:
 *                     type: string
 *             example:
 *               - evaluationId: 1
 *                 questionnaireTitle: "კომუნიკაციის შეფასება"
 *                 evaluateeName: "გიორგი მაისურაძე"
 *                 status: "pending"
 */
router.get('/my-pending-evaluations', authenticate, getPendingEvaluations);

/**
 * @swagger
 * /api/feedback/evaluations/{evaluationId}:
 *   get:
 *     summary: კონკრეტული კითხვარის კითხვები და პასუხები (შესავსებად წამოღება)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: კითხვები და ვარიანტები
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 evaluateeName:
 *                   type: string
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       text:
 *                         type: string
 *                       options:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             text:
 *                               type: string
 *             example:
 *               id: 1
 *               title: "კომუნიკაციის შეფასება"
 *               evaluateeName: "გიორგი მაისურაძე"
 *               questions:
 *                 - id: 1
 *                   text: "როგორია მისი კომუნიკაცია გუნდში?"
 *                   options:
 *                     - id: 1
 *                       text: "კარგი"
 *                     - id: 2
 *                       text: "საშუალო"
 */
router.get('/evaluations/:evaluationId', authenticate, getEvaluationDetails);

/**
 * @swagger
 * /api/feedback/evaluations/{evaluationId}/submit:
 *   post:
 *     summary: კითხვარის შევსება (პასუხების გაგზავნა)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
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
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                     optionId:
 *                       type: integer
 *             example:
 *               answers: [
 *                 { questionId: 1, optionId: 2 },
 *                 { questionId: 2, optionId: 5 }
 *               ]
 *     responses:
 *       200:
 *         description: შევსებულია
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "შეფასება წარმატებით გაიგზავნა"
 */
router.post('/evaluations/:evaluationId/submit', authenticate, submitEvaluation);

/**
 * @swagger
 * /api/feedback/my-results:
 *   get:
 *     summary: ჩემზე დაწერილი შეფასებების ნახვა (ანონიმურად, არ ჩანს ვინ შეავსო)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: შედეგების სია
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   questionnaireTitle:
 *                     type: string
 *                   questions:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         question:
 *                           type: string
 *                         answers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               optionText:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *             example:
 *               - questionnaireTitle: "კომუნიკაციის შეფასება"
 *                 questions:
 *                   - question: "როგორია მისი კომუნიკაცია გუნდში?"
 *                     answers:
 *                       - optionText: "კარგი"
 *                         count: 2
 *                       - optionText: "საშუალო"
 *                         count: 1
 */
router.get('/my-results', authenticate, getMyResults);

module.exports = router;
