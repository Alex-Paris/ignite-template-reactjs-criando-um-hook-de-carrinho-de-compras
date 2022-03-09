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
      const newCartList = cart.filter(cart => cart.id !== productId);
      let newProduct = cart.find(cart => cart.id === productId);

      if (!newProduct) {
        newProduct = await api.get<Product>(`products/${productId}`).then(response => { return {
          ...response.data,
          amount: 0
        }});
      }

      if (!newProduct) {
        throw new Error();
      }

      const stockProduct = await api.get<Stock>(`stock/${productId}`).then(response => response.data);

      if (!stockProduct) {
        throw new Error();
      }

      if (newProduct.amount === stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      newProduct.amount += 1;

      const updatedCart = [...newCartList, newProduct];
      
      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter(cart => cart.id !== productId);

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockProduct = await api.get<Stock>(`stock/${productId}`).then(response => response.data);

      if (!stockProduct) {
        throw new Error();
      }

      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCartList = cart.filter(cart => cart.id !== productId);
      const updatedProduct = cart.find(cart => cart.id === productId);

      if (!updatedProduct) {
        throw new Error();
      }

      updatedProduct.amount = amount;

      const updatedCart = [...newCartList, updatedProduct];
      
      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
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
