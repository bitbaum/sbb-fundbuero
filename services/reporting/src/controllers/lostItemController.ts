import { Request, Response } from 'express';
import { LostItemRepository } from '../repositories/lostItemRepository';
import { CreateLostItemRequest, SearchItemsQuery, ApiResponse } from '@sbb-fundbuero/types';
import { logger } from '../utils/logger';
import { redisPublisher } from '../config/redis';

export class LostItemController {
  private lostItemRepository = new LostItemRepository();

  async createLostItem(req: Request, res: Response): Promise<void> {
    try {
      const reporterId = req.user?.id; // Assuming user is attached by auth middleware
      if (!reporterId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        } as ApiResponse<null>);
        return;
      }

      const data: CreateLostItemRequest = req.body;
      const lostItem = await this.lostItemRepository.create(reporterId, data);

      // Publish event for real-time notifications
      await redisPublisher.publish(
        'lost_item_created',
        JSON.stringify({
          type: 'lost_item_created',
          data: { lostItem },
          timestamp: new Date(),
        }),
      );

      res.status(201).json({
        success: true,
        data: lostItem,
      } as ApiResponse<typeof lostItem>);

      logger.info('Lost item created successfully', {
        itemId: lostItem.id,
        reporterId,
        category: lostItem.category,
      });
    } catch (error) {
      logger.error('Failed to create lost item', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create lost item' },
      } as ApiResponse<null>);
    }
  }

  async getLostItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lostItem = await this.lostItemRepository.findById(id);

      if (!lostItem) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lost item not found' },
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        data: lostItem,
      } as ApiResponse<typeof lostItem>);
    } catch (error) {
      logger.error('Failed to get lost item', { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve lost item' },
      } as ApiResponse<null>);
    }
  }

  async getUserLostItems(req: Request, res: Response): Promise<void> {
    try {
      const reporterId = req.user?.id;
      if (!reporterId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        } as ApiResponse<null>);
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const lostItems = await this.lostItemRepository.findByReporter(reporterId, limit, offset);

      res.json({
        success: true,
        data: lostItems,
        pagination: { total: lostItems.length, limit, offset },
      } as ApiResponse<typeof lostItems>);
    } catch (error) {
      logger.error('Failed to get user lost items', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve lost items' },
      } as ApiResponse<null>);
    }
  }

  async searchLostItems(req: Request, res: Response): Promise<void> {
    try {
      const searchParams: SearchItemsQuery = {
        query: req.query.query as string,
        category: req.query.category as any,
        color: req.query.color as string,
        brand: req.query.brand as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        vehicleId: req.query.vehicleId as string,
        status: req.query.status as any,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      };

      const result = await this.lostItemRepository.search(searchParams);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          limit: searchParams.limit!,
          offset: searchParams.offset!,
        },
      } as ApiResponse<typeof result.items>);
    } catch (error) {
      logger.error('Failed to search lost items', { error, query: req.query });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to search lost items' },
      } as ApiResponse<null>);
    }
  }

  async updateLostItemStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedItem = await this.lostItemRepository.updateStatus(id, status);

      if (!updatedItem) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lost item not found' },
        } as ApiResponse<null>);
        return;
      }

      // Publish status update event
      await redisPublisher.publish(
        'lost_item_status_updated',
        JSON.stringify({
          type: 'lost_item_status_updated',
          data: { itemId: id, status },
          timestamp: new Date(),
        }),
      );

      res.json({
        success: true,
        data: updatedItem,
      } as ApiResponse<typeof updatedItem>);

      logger.info('Lost item status updated', { itemId: id, status });
    } catch (error) {
      logger.error('Failed to update lost item status', { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update lost item status' },
      } as ApiResponse<null>);
    }
  }
}

// Extend Express Request to include user.
//
// `no-namespace` exempts declaration merging, which is exactly what this is:
// augmenting an interface from a third-party package has no ES2015-module
// equivalent, so the alternative the rule prefers does not exist here.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        sbbUserId: string;
        email: string;
      };
    }
  }
}
