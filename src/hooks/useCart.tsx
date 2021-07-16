import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`products/${productId}`);
      const productAlreadyInCart = cart.findIndex(product => product.id === productId);
      if (productAlreadyInCart < 0) {
        const stockResponse = await api.get(`stock/${productId}`);
        const productStock = stockResponse.data;
        if (productStock.amount >= 1) {
          const updatedCart = [...cart, { ...response.data, amount: 1 }];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
          setCart(updatedCart)
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }

      } else {
        updateProductAmount({ productId, amount: cart[productAlreadyInCart].amount + 1 })
        return;
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.findIndex(product => product.id === productId);
      if (productInCart < 0) {
        toast.error('Erro na remoção do produto');
      } else {

        const updatedCart = [...cart].filter(product => product.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        setCart(updatedCart)
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return;
    try {
      const stockResponse = await api.get<Stock>(`stock/${productId}`);
      const productStock = stockResponse.data;
      if (productStock.amount >= amount) {
        const updatedCart = [...cart];
        const productIndex = updatedCart.findIndex(product => product.id === productId)
        if (productIndex < 0) {
          toast.error('Erro na alteração de quantidade do produto');
        } else {
          updatedCart[productIndex].amount = amount
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
          setCart(updatedCart)
        }
      } else {
        toast.error('Quantidade solicitada fora de estoque')
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
