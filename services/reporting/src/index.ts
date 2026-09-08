import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'http';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from './config/database';
import { connectRedis, redisSubscriber } from './config/redis';
import { logger } from './utils/logger';

import lostItemsRouter from './routes/lostItems';
import driverNotificationsRouter from './routes/driverNotifications';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SBB Fundbüro API - Reporting Service',
      version: '1.0.0',
      description: 'Core reporting microservice for lost and found items',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'Reporting Service API',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ItemCategory: {
          type: 'string',
          enum: [
            'electronics',
            'clothing',
            'bags',
            'documents',
            'jewelry',
            'books',
            'toys',
            'sports_equipment',
            'medical',
            'other',
          ],
        },
        ItemStatus: {
          type: 'string',
          enum: ['reported_lost', 'reported_found', 'matched', 'returned', 'disposed'],
        },
        CreateLostItemRequest: {
          type: 'object',
          required: ['category', 'title', 'description'],
          properties: {
            tripId: { type: 'string', format: 'uuid' },
            category: { $ref: '#/components/schemas/ItemCategory' },
            title: { type: 'string', minLength: 3, maxLength: 255 },
            description: { type: 'string', minLength: 10, maxLength: 2000 },
            color: { type: 'string', maxLength: 100 },
            brand: { type: 'string', maxLength: 100 },
            size: { type: 'string', maxLength: 50 },
            distinctiveFeatures: { type: 'string', maxLength: 1000 },
            approximateLossTime: { type: 'string', format: 'date-time' },
            lossLocation: { type: 'string', maxLength: 255 },
            contactInfo: { type: 'object' },
            rewardOffered: { type: 'number', minimum: 0, maximum: 10000 },
            images: { type: 'array', items: { type: 'string', format: 'uri' }, maxItems: 10 },
          },
        },
        LostItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reporterId: { type: 'string', format: 'uuid' },
            tripId: { type: 'string', format: 'uuid' },
            category: { $ref: '#/components/schemas/ItemCategory' },
            title: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string' },
            brand: { type: 'string' },
            size: { type: 'string' },
            distinctiveFeatures: { type: 'string' },
            approximateLossTime: { type: 'string', format: 'date-time' },
            lossLocation: { type: 'string' },
            contactInfo: { type: 'object' },
            rewardOffered: { type: 'number' },
            status: { $ref: '#/components/schemas/ItemStatus' },
            images: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LostItemResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/LostItem' },
          },
        },
        LostItemSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/LostItem' },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }),
);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'reporting-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Routes
app.use('/api/lost-items', lostItemsRouter);
app.use('/api/driver-notifications', driverNotificationsRouter);

// WebSocket for real-time notifications
io.on('connection', (socket) => {
  logger.info('Client connected to WebSocket', { socketId: socket.id });

  socket.on('join_room', (room: string) => {
    socket.join(room);
    logger.debug('Client joined room', { socketId: socket.id, room });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Setup Redis event listeners function
const setupRedisEventListeners = async () => {
  // Subscribe to channels
  await redisSubscriber.subscribe('lost_item_created', (message: string) => {
    try {
      const event = JSON.parse(message);
      io.emit('lost_item_created', event);
      logger.debug('Broadcast lost_item_created event via WebSocket', { type: event.type });
    } catch (error) {
      logger.error('Failed to broadcast lost_item_created event', { error, message });
    }
  });

  await redisSubscriber.subscribe('lost_item_status_updated', (message: string) => {
    try {
      const event = JSON.parse(message);
      io.emit('lost_item_status_updated', event);
      logger.debug('Broadcast lost_item_status_updated event via WebSocket', { type: event.type });
    } catch (error) {
      logger.error('Failed to broadcast lost_item_status_updated event', { error, message });
    }
  });
};

// Error handling middleware.
//
// `_next` is unused but MUST stay: Express identifies an error handler by its
// ARITY, so dropping the fourth parameter silently demotes this to ordinary
// middleware that never runs on error. Renamed rather than removed.
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, path: req.path, method: req.method });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const start = async (): Promise<void> => {
  try {
    await connectDatabase();
    await connectRedis();
    await setupRedisEventListeners();

    const port = process.env.PORT || 3001;
    httpServer.listen(port, () => {
      logger.info(`Reporting service started on port ${port}`, {
        environment: process.env.NODE_ENV || 'development',
        docs: `http://localhost:${port}/docs`,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();
