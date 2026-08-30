import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<Product[]> {
    const res = await this.db.query<Product>('SELECT id, name, description, price::float, stock_quantity FROM products ORDER BY id ASC');
    return res.rows;
  }

  async findOne(id: string): Promise<Product> {
    const res = await this.db.query<Product>('SELECT id, name, description, price::float, stock_quantity FROM products WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      throw new NotFoundException(`Produto com ID ${id} não foi encontrado.`);
    }
    return res.rows[0];
  }
}
