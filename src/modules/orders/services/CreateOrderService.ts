import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Cliente não encontrado!');
    }

    const productsIds = products.map(product => ({ id: product.id }));

    const findProducts = await this.productsRepository.findAllById(productsIds);

    if (findProducts.length === 0) {
      throw new AppError('Os produtos informados não foram encontrados!');
    }

    const overQuantityProducts = findProducts.map(product =>
      products.filter(p => p.quantity < product.quantity),
    );

    if (overQuantityProducts.length > 0) {
      throw new AppError(
        'Não existem produtos suficientes para a conclusão da compra!',
      );
    }

    const orderProducts = findProducts.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: product.price,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
