import { Pool } from 'pg';
import { LostItem, CreateLostItemRequest, SearchItemsQuery } from '@sbb-fundbuero/types';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export class LostItemRepository {
  constructor(private db: Pool = pool) {}

  async create(reporterId: string, data: CreateLostItemRequest): Promise<LostItem> {
    const query = `
      INSERT INTO lost_items (
        reporter_id, trip_id, category, title, description, color, brand, size,
        distinctive_features, approximate_loss_time, loss_location, contact_info,
        reward_offered, images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      reporterId,
      data.tripId || null,
      data.category,
      data.title,
      data.description,
      data.color || null,
      data.brand || null,
      data.size || null,
      data.distinctiveFeatures || null,
      data.approximateLossTime ? new Date(data.approximateLossTime) : null,
      data.lossLocation || null,
      data.contactInfo ? JSON.stringify(data.contactInfo) : null,
      data.rewardOffered || 0,
      data.images || [],
    ];

    try {
      const result = await this.db.query(query, values);
      logger.info('Lost item created', { itemId: result.rows[0].id, reporterId });
      return this.mapRowToLostItem(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create lost item', { error, reporterId, data });
      throw error;
    }
  }

  async findById(id: string): Promise<LostItem | null> {
    const query = 'SELECT * FROM lost_items WHERE id = $1';

    try {
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToLostItem(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find lost item by ID', { error, id });
      throw error;
    }
  }

  async findByReporter(reporterId: string, limit = 50, offset = 0): Promise<LostItem[]> {
    const query = `
      SELECT * FROM lost_items
      WHERE reporter_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [reporterId, limit, offset]);
      return result.rows.map((row) => this.mapRowToLostItem(row));
    } catch (error) {
      logger.error('Failed to find lost items by reporter', { error, reporterId });
      throw error;
    }
  }

  async search(params: SearchItemsQuery): Promise<{ items: LostItem[]; total: number }> {
    let baseQuery = `
      FROM lost_items li
      LEFT JOIN trips t ON li.trip_id = t.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      WHERE 1=1
    `;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.query) {
      conditions.push(`(
        to_tsvector('german', li.title || ' ' || li.description) @@ plainto_tsquery('german', $${paramIndex})
        OR li.title ILIKE $${paramIndex + 1}
        OR li.description ILIKE $${paramIndex + 1}
      )`);
      values.push(params.query, `%${params.query}%`);
      paramIndex += 2;
    }

    if (params.category) {
      conditions.push(`li.category = $${paramIndex}`);
      values.push(params.category);
      paramIndex++;
    }

    if (params.color) {
      conditions.push(`li.color ILIKE $${paramIndex}`);
      values.push(`%${params.color}%`);
      paramIndex++;
    }

    if (params.brand) {
      conditions.push(`li.brand ILIKE $${paramIndex}`);
      values.push(`%${params.brand}%`);
      paramIndex++;
    }

    if (params.dateFrom) {
      conditions.push(`li.created_at >= $${paramIndex}`);
      values.push(new Date(params.dateFrom));
      paramIndex++;
    }

    if (params.dateTo) {
      conditions.push(`li.created_at <= $${paramIndex}`);
      values.push(new Date(params.dateTo));
      paramIndex++;
    }

    if (params.vehicleId) {
      conditions.push(`v.id = $${paramIndex}`);
      values.push(params.vehicleId);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`li.status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (conditions.length > 0) {
      baseQuery += ' AND ' + conditions.join(' AND ');
    }

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const itemsQuery = `
      SELECT li.* ${baseQuery}
      ORDER BY li.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    try {
      const [countResult, itemsResult] = await Promise.all([
        this.db.query(countQuery, values.slice(0, -2)),
        this.db.query(itemsQuery, values),
      ]);

      return {
        items: itemsResult.rows.map((row) => this.mapRowToLostItem(row)),
        total: parseInt(countResult.rows[0].total),
      };
    } catch (error) {
      logger.error('Failed to search lost items', { error, params });
      throw error;
    }
  }

  async updateStatus(id: string, status: string): Promise<LostItem | null> {
    const query = `
      UPDATE lost_items
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [status, id]);
      if (result.rows.length > 0) {
        logger.info('Lost item status updated', { itemId: id, status });
        return this.mapRowToLostItem(result.rows[0]);
      }
      return null;
    } catch (error) {
      logger.error('Failed to update lost item status', { error, id, status });
      throw error;
    }
  }

  private mapRowToLostItem(row: any): LostItem {
    return {
      id: row.id,
      reporterId: row.reporter_id,
      tripId: row.trip_id,
      category: row.category,
      title: row.title,
      description: row.description,
      color: row.color,
      brand: row.brand,
      size: row.size,
      distinctiveFeatures: row.distinctive_features,
      approximateLossTime: row.approximate_loss_time,
      lossLocation: row.loss_location,
      contactInfo: row.contact_info,
      rewardOffered: parseFloat(row.reward_offered),
      status: row.status,
      aiEmbedding: row.ai_embedding,
      images: row.images || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
