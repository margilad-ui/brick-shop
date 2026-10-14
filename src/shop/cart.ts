import { useEffect, useState } from 'react'
import type { ShopItem } from './data'

export type CartLine = { id: string; set_num: string | null; name: string; image: string | null; price: number; qty: number; max: number; demo: boolean; theme: string | null }
const KEY = 'bs_cart'
let lines: CartLine[] = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } })()
const listeners = new Set<() => void>()
let lastEvent: { type: 'add'; line: CartLine; at: number } | null = null
function save() { try { localStorage.setItem(KEY, JSON.stringify(lines)) } catch { /* ignore */ } listeners.forEach(f => f()) }

export function cartLines() { return lines }
export function cartCount() { return lines.reduce((s, l) => s + l.qty, 0) }
export function cartTotal() { return lines.reduce((s, l) => s + l.qty * l.price, 0) }
export function inCart(id: string) { return lines.find(l => l.id === id)?.qty || 0 }
export function addToCart(i: ShopItem) {
  const ex = lines.find(l => l.id === i.id)
  const max = Math.max(1, i.qty || 1)
  if (ex) { if (ex.qty >= max) return false; ex.qty++ }
  else lines = [...lines, { id: i.id, set_num: i.set_num, name: i.name || i.set_num || '', image: i.image_url, price: Number(i.price || 0), qty: 1, max, demo: i.demo, theme: i.theme }]
  lastEvent = { type: 'add', line: lines.find(l => l.id === i.id)!, at: Date.now() }
  save(); return true
}
export function setQty(id: string, qty: number) { lines = lines.map(l => l.id === id ? { ...l, qty: Math.min(l.max, Math.max(0, qty)) } : l).filter(l => l.qty > 0); save() }
export function removeLine(id: string) { lines = lines.filter(l => l.id !== id); save() }
export function clearCart() { lines = []; save() }
export function takeLastEvent() { const e = lastEvent; lastEvent = null; return e }

export function useCart() {
  const [, tick] = useState(0)
  useEffect(() => { const f = () => tick(t => t + 1); listeners.add(f); return () => { listeners.delete(f) } }, [])
  return { lines, count: cartCount(), total: cartTotal() }
}

/* drawer open state (global, so the header button and the add animation can open it) */
let drawerOpen = false
const dl = new Set<() => void>()
export function openDrawer(v = true) { drawerOpen = v; dl.forEach(f => f()) }
export function useDrawer() { const [, tick] = useState(0); useEffect(() => { const f = () => tick(t => t + 1); dl.add(f); return () => { dl.delete(f) } }, []); return drawerOpen }
