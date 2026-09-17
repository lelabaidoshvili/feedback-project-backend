require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Project Feedback API',
            version: '1.0.0',
            description: 'API for User Auth, Projects, and Anonymous Feedback',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/feedback', feedbackRoutes);

const server = app.listen(PORT, (err) => {
    // Express-ში ეს callback შეცდომის დროსაც გამოიძახება, ამიტომ ვამოწმებთ err-ს
    if (err) return;
    console.log(`სერვერი გაეშვა მისამართზე: http://localhost:${PORT}`);
    console.log(`Swagger დოკუმენტაცია: http://localhost:${PORT}/api-docs`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`პორტი ${PORT} უკვე დაკავებულია. გაათავისუფლეთ პორტი ან შეცვალეთ PORT .env ფაილში.`);
    } else {
        console.error('სერვერის გაშვების შეცდომა:', err);
    }
    process.exit(1);
});
