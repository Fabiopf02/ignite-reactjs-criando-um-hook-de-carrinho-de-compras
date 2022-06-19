import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: (props: UpdateProductAmount) => Promise<void>
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const saveCart = (cartData: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartData))
  }

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get<Product>(`/products/${productId}`)
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)
      const exists = cart.find((p) => p.id === productId)
      const amount = exists ? exists.amount + 1 : 1
      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      const newCart = exists
        ? cart.map((cartItem) => {
            if (cartItem.id === productId) cartItem.amount = amount
            return cartItem
          })
        : [...cart, { ...product, amount }]
      saveCart(newCart)
      setCart(newCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((p) => p.id === productId))
        throw new Error('Produto não encontrado')
      const newCart = cart.filter((p) => p.id !== productId)
      setCart(newCart)
      saveCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)
      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      const newCart = cart.map((cartItem) => {
        if (cartItem.id === productId) cartItem.amount = amount
        return cartItem
      })
      setCart(newCart)
      saveCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
