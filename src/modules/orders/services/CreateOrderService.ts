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

    const requestedProducts = await this.productsRepository.findAllById(
      products,
    );

    if (!requestedProducts) {
      throw new AppError('Os produtos informados não foram encontrados!');
    }

    const productsList = products.map(product => {
      const findProduct = requestedProducts.find(
        requestedProduct => requestedProduct.id === product.id,
      );

      if (!findProduct) {
        throw new AppError('Um dos produtos informados não existe!');
      }

      if (findProduct.quantity < product.quantity) {
        throw new AppError(
          'Não existem produtos suficientes para a conclusão da compra!',
        );
      }

      return {
        product_id: product.id,
        price: findProduct.price,
        quantity: product.quantity,
      };
    });

    const updatedProducts = products.map(product => {
      const findProduct = requestedProducts.find(
        requestedProduct => requestedProduct.id === product.id,
      );

      if (!findProduct) {
        throw new AppError('Produto não encontrado!');
      }

      const newQuantity = findProduct.quantity - product.quantity;

      return {
        id: findProduct.id,
        quantity: newQuantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsList,
    });

    await this.productsRepository.updateQuantity(updatedProducts);

    return order;
  }
}

export default CreateOrderService;
