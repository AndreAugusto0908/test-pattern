import { CheckoutService } from '../src/services/CheckoutService.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { UserMother } from './builders/UserMother.js';

describe('CheckoutService', () => {
    const cartaoCredito = {
        numero: '4111111111111111',
        validade: '12/30',
        cvv: '123'
    };

    describe('quando o pagamento falha', () => {
        test('retorna null', async () => {
            const carrinho = new CarrinhoBuilder().build();
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false })
            };
            const repositoryDummy = {};
            const emailServiceDummy = {};
            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryDummy,
                emailServiceDummy
            );

            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            expect(pedido).toBeNull();
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        test('aplica desconto e envia e-mail de aprovacao', async () => {
            const userPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(userPremium)
                .comItens([
                    new Item('Produto A', 120),
                    new Item('Produto B', 80)
                ])
                .build();
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };
            const repositoryStub = {
                salvar: jest.fn().mockImplementation(async (pedido) => (
                    new Pedido(10, pedido.carrinho, pedido.totalFinal, pedido.status)
                ))
            };
            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue()
            };
            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            expect(pedido.totalFinal).toBe(180);
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 10 no valor de R$180'
            );
        });
    });
});
