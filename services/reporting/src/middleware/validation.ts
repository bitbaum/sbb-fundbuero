import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ItemCategory, ItemStatus } from '@sbb-fundbuero/types';
import { logger } from '../utils/logger';

const createLostItemSchema = Joi.object({
  tripId: Joi.string().uuid().optional(),
  category: Joi.string()
    .valid(...Object.values(ItemCategory))
    .required(),
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().min(10).max(2000).required(),
  color: Joi.string().max(100).optional(),
  brand: Joi.string().max(100).optional(),
  size: Joi.string().max(50).optional(),
  distinctiveFeatures: Joi.string().max(1000).optional(),
  approximateLossTime: Joi.string().isoDate().optional(),
  lossLocation: Joi.string().max(255).optional(),
  contactInfo: Joi.object().optional(),
  rewardOffered: Joi.number().min(0).max(10000).optional(),
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
});

const searchSchema = Joi.object({
  query: Joi.string().max(255).optional(),
  category: Joi.string()
    .valid(...Object.values(ItemCategory))
    .optional(),
  color: Joi.string().max(100).optional(),
  brand: Joi.string().max(100).optional(),
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional(),
  vehicleId: Joi.string().uuid().optional(),
  routeId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid(...Object.values(ItemStatus))
    .optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

export const validateCreateLostItem = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = createLostItemSchema.validate(req.body);

  if (error) {
    logger.warn('Validation failed for create lost item', { error: error.details, body: req.body });
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
    });
    return;
  }

  next();
};

export const validateSearch = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = searchSchema.validate(req.query);

  if (error) {
    logger.warn('Validation failed for search', { error: error.details, query: req.query });
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid search parameters',
        details: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      },
    });
    return;
  }

  next();
};
