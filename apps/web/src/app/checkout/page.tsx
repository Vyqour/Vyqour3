'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { apiClient } from '@/lib/api';
import type { Address, Order } from '@/types';
import { formatInr } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const { cart, fetchCart } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [newAddr, setNewAddr] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetchCart().catch(() => undefined);
  }, [fetchCart]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/login?next=/checkout');
      return;
    }
    apiClient
      .get<Address[]>('/addresses', { auth: true })
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setAddressId(def.id);
        if (!list.length) setShowNew(true);
      })
      .catch(() => undefined);
  }, [user, hydrated, router]);

  const saveAddress = async () => {
    try {
      const addr = await apiClient.post<Address>('/addresses', { ...newAddr, isDefault: true }, { auth: true });
      setAddresses((a) => [...a, addr]);
      setAddressId(addr.id);
      setShowNew(false);
      toast.success('Address saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const placeOrder = async () => {
    if (!addressId) return toast.error('Select a shipping address');
    setLoading(true);
    try {
      const order = await apiClient.post<Order>(
        '/orders',
        {
          shippingAddressId: addressId,
          paymentMethod,
          notes,
          couponCode: cart?.summary.couponCode,
        },
        { auth: true },
      );
      await fetchCart();
      if (paymentMethod === 'RAZORPAY') {
        try {
          const pay = await apiClient.post<{
            razorpayOrderId: string;
            amount: number;
            currency?: string;
            keyId: string;
            orderId: string;
            orderNumber?: string;
            mock?: boolean;
          }>(`/payments/orders/${order.id}/create`, {}, { auth: true });

          if (pay.mock) {
            await apiClient.post(
              '/payments/verify',
              {
                orderId: order.id,
                razorpayOrderId: pay.razorpayOrderId,
                razorpayPaymentId: `pay_mock_${Date.now()}`,
                razorpaySignature: 'mock',
              },
              { auth: true },
            );
            toast.success('Order placed');
            router.push(`/orders?highlight=${order.orderNumber}`);
          } else {
            // Real Razorpay flow — open Checkout widget and wait for payment.
            setLoading(false);
            await openRazorpayCheckout(pay, order, user);
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Payment failed to start');
          setLoading(false);
        }
        return;
      }
      toast.success('Order placed');
      router.push(`/orders?highlight=${order.orderNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const openRazorpayCheckout = async (
    pay: { razorpayOrderId: string; amount: number; currency?: string; keyId: string },
    order: Order,
    currentUser: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null,
  ) => {
    await loadRazorpayScript();
    const RazorpayCtor = (window as unknown as { Razorpay?: new (opts: object) => { open: () => void } })
      .Razorpay;
    if (!RazorpayCtor) {
      toast.error('Unable to load payment gateway. Please try again.');
      return;
    }

    const rzp = new RazorpayCtor({
      key: pay.keyId,
      amount: pay.amount,
      currency: pay.currency || 'INR',
      name: 'VYQOUR',
      description: `Order ${order.orderNumber}`,
      order_id: pay.razorpayOrderId,
      prefill: {
        name: [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' '),
        email: currentUser?.email || '',
        contact: currentUser?.phone || '',
      },
      theme: { color: '#5B21B6' },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await apiClient.post(
            '/payments/verify',
            {
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
            { auth: true },
          );
          toast.success('Payment successful');
          router.push(`/orders?highlight=${order.orderNumber}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Payment verification failed');
          router.push(`/orders?highlight=${order.orderNumber}`);
        }
      },
      modal: {
        ondismiss: () => {
          toast.error('Payment cancelled. You can retry from your orders page.');
          router.push(`/orders?highlight=${order.orderNumber}`);
        },
      },
    });
    rzp.open();
  };

  const loadRazorpayScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.getElementById('razorpay-checkout-js')) return resolve();
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });

  if (!hydrated || !cart) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!cart.items?.length) {
    return (
      <div className="container-px py-16 text-center">
        <p>Your bag is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/shop">Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <h1 className="text-3xl font-medium">Checkout</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Shipping address</h2>
              <button className="text-sm text-primary-glow" onClick={() => setShowNew((v) => !v)}>
                {showNew ? 'Cancel' : 'Add new'}
              </button>
            </div>
            {showNew && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(['fullName', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode'] as const).map((k) => (
                  <div key={k} className={k === 'line1' || k === 'line2' ? 'sm:col-span-2' : ''}>
                    <label className="label-field">{k}</label>
                    <Input
                      value={newAddr[k]}
                      onChange={(e) => setNewAddr((a) => ({ ...a, [k]: e.target.value }))}
                    />
                  </div>
                ))}
                <Button onClick={saveAddress} className="sm:col-span-2">
                  Save address
                </Button>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
                    addressId === a.id ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <span className="text-sm">
                    <strong>{a.fullName}</strong> · {a.phone}
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="font-medium">Payment</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { id: 'COD' as const, label: 'Cash on Delivery' },
                { id: 'RAZORPAY' as const, label: 'UPI / Card / Netbanking' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`rounded-xl border p-4 text-left text-sm ${
                    paymentMethod === m.id ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="label-field">Order notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </section>
        </div>

        <aside className="glass h-fit rounded-2xl p-6">
          <h2 className="font-medium">Summary</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="line-clamp-1">
                  {i.product.name} × {i.quantity}
                </span>
                <span className="text-white">{formatInr(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{formatInr(cart.summary.total)}</span>
            </div>
          </div>
          <Button className="mt-6 w-full" size="lg" loading={loading} onClick={placeOrder}>
            Place order
          </Button>
        </aside>
      </div>
    </div>
  );
}
  useEffect(() => {
    fetchCart().catch(() => undefined);
  }, [fetchCart]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/login?next=/checkout');
      return;
    }
    apiClient
      .get<Address[]>('/addresses', { auth: true })
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setAddressId(def.id);
        if (!list.length) setShowNew(true);
      })
      .catch(() => undefined);
  }, [user, hydrated, router]);

  const saveAddress = async () => {
    try {
      const addr = await apiClient.post<Address>('/addresses', { ...newAddr, isDefault: true }, { auth: true });
      setAddresses((a) => [...a, addr]);
      setAddressId(addr.id);
      setShowNew(false);
      toast.success('Address saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const placeOrder = async () => {
    if (!addressId) return toast.error('Select a shipping address');
    setLoading(true);
    try {
      const order = await apiClient.post<Order>(
        '/orders',
        {
          shippingAddressId: addressId,
          paymentMethod,
          notes,
          couponCode: cart?.summary.couponCode,
        },
        { auth: true },
      );
      await fetchCart();
      if (paymentMethod === 'RAZORPAY') {
        try {
          const pay = await apiClient.post<{
            razorpayOrderId: string;
            amount: number;
            currency?: string;
            keyId: string;
            orderId: string;
            orderNumber?: string;
            mock?: boolean;
          }>(`/payments/orders/${order.id}/create`, {}, { auth: true });

          if (pay.mock) {
            await apiClient.post(
              '/payments/verify',
              {
                orderId: order.id,
                razorpayOrderId: pay.razorpayOrderId,
                razorpayPaymentId: `pay_mock_${Date.now()}`,
                razorpaySignature: 'mock',
              },
              { auth: true },
            );
            toast.success('Order placed');
            router.push(`/orders?highlight=${order.orderNumber}`);
          } else {
            // Real Razorpay flow — open Checkout widget and wait for payment.
            setLoading(false);
            await openRazorpayCheckout(pay, order, user);
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Payment failed to start');
          setLoading(false);
        }
        return;
      }
      toast.success('Order placed');
      router.push(`/orders?highlight=${order.orderNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const openRazorpayCheckout = async (
    pay: { razorpayOrderId: string; amount: number; currency?: string; keyId: string },
    order: Order,
    currentUser: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null,
  ) => {
    await loadRazorpayScript();
    const RazorpayCtor = (window as unknown as { Razorpay?: new (opts: object) => { open: () => void } })
      .Razorpay;
    if (!RazorpayCtor) {
      toast.error('Unable to load payment gateway. Please try again.');
      return;
    }

    const rzp = new RazorpayCtor({
      key: pay.keyId,
      amount: pay.amount,
      currency: pay.currency || 'INR',
      name: 'VYQOUR',
      description: `Order ${order.orderNumber}`,
      order_id: pay.razorpayOrderId,
      prefill: {
        name: [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' '),
        email: currentUser?.email || '',
        contact: currentUser?.phone || '',
      },
      theme: { color: '#5B21B6' },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await apiClient.post(
            '/payments/verify',
            {
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
            { auth: true },
          );
          toast.success('Payment successful');
          router.push(`/orders?highlight=${order.orderNumber}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Payment verification failed');
          router.push(`/orders?highlight=${order.orderNumber}`);
        }
      },
      modal: {
        ondismiss: () => {
          toast.error('Payment cancelled. You can retry from your orders page.');
          router.push(`/orders?highlight=${order.orderNumber}`);
        },
      },
    });
    rzp.open();
  };

  const loadRazorpayScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.getElementById('razorpay-checkout-js')) return resolve();
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });

  if (!hydrated || !cart) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!cart.items?.length) {
    return (
      <div className="container-px py-16 text-center">
        <p>Your bag is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/shop">Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <h1 className="text-3xl font-medium">Checkout</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Shipping address</h2>
              <button className="text-sm text-primary-glow" onClick={() => setShowNew((v) => !v)}>
                {showNew ? 'Cancel' : 'Add new'}
              </button>
            </div>
            {showNew && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(['fullName', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode'] as const).map((k) => (
                  <div key={k} className={k === 'line1' || k === 'line2' ? 'sm:col-span-2' : ''}>
                    <label className="label-field">{k}</label>
                    <Input
                      value={newAddr[k]}
                      onChange={(e) => setNewAddr((a) => ({ ...a, [k]: e.target.value }))}
                    />
                  </div>
                ))}
                <Button onClick={saveAddress} className="sm:col-span-2">
                  Save address
                </Button>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
                    addressId === a.id ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <span className="text-sm">
                    <strong>{a.fullName}</strong> · {a.phone}
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="font-medium">Payment</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { id: 'COD' as const, label: 'Cash on Delivery' },
                { id: 'RAZORPAY' as const, label: 'UPI / Card / Netbanking' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`rounded-xl border p-4 text-left text-sm ${
                    paymentMethod === m.id ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="label-field">Order notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </section>
        </div>

        <aside className="glass h-fit rounded-2xl p-6">
          <h2 className="font-medium">Summary</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="line-clamp-1">
                  {i.product.name} × {i.quantity}
                </span>
                <span className="text-white">{formatInr(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{formatInr(cart.summary.total)}</span>
            </div>
          </div>
          <Button className="mt-6 w-full" size="lg" loading={loading} onClick={placeOrder}>
            Place order
          </Button>
        </aside>
      </div>
    </div>
  );
}
  useEffect(() => {
    fetchCart().catch(() => undefined);
  }, [fetchCart]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/login?next=/checkout');
      return;
    }
    apiClient
      .get<Address[]>('/addresses', { auth: true })
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setAddressId(def.id);
        if (!list.length) setShowNew(true);
      })
      .catch(() => undefined);
  }, [user, hydrated, router]);

  const saveAddress = async () => {
    try {
      const addr = await apiClient.post<Address>('/addresses', { ...newAddr, isDefault: true }, { auth: true });
      setAddresses((a) => [...a, addr]);
      setAddressId(addr.id);
      setShowNew(false);
      toast.success('Address saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const placeOrder = async () => {
    if (!addressId) return toast.error('Select a shipping address');
    setLoading(true);
    try {
      const order = await apiClient.post<Order>(
        '/orders',
        {
          shippingAddressId: addressId,
          paymentMethod,
          notes,
          couponCode: cart?.summary.couponCode,
        },
        { auth: true },
      );
      await fetchCart();
      if (paymentMethod === 'RAZORPAY') {
        try {
          const pay = await apiClient.post<{
            razorpayOrderId: string;
            amount: number;
            keyId: string;
            orderId: string;
            mock?: boolean;
          }>(`/payments/orders/${order.id}/create`, {}, { auth: true });
          if (pay.mock) {
            await apiClient.post(
              '/payments/verify',
              {
                orderId: order.id,
                razorpayOrderId: pay.razorpayOrderId,
                razorpayPaymentId: `pay_mock_${Date.now()}`,
                razorpaySignature: 'mock',
              },
              { auth: true },
            );
          }
        } catch {
          /* COD fallback path already created order */
        }
      }
      toast.success('Order placed');
      router.push(`/orders?highlight=${order.orderNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || !cart) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!cart.items?.length) {
    return (
      <div className="container-px py-16 text-center">
        <p>Your bag is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/shop">Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <h1 className="text-3xl font-medium">Checkout</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Shipping address</h2>
              <button className="text-sm text-primary-glow" onClick={() => setShowNew((v) => !v)}>
                {showNew ? 'Cancel' : 'Add new'}
              </button>
            </div>
            {showNew && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(['fullName', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode'] as const).map((k) => (
                  <div key={k} className={k === 'line1' || k === 'line2' ? 'sm:col-span-2' : ''}>
                    <label className="label-field">{k}</label>
                    <Input
                      value={newAddr[k]}
                      onChange={(e) => setNewAddr((a) => ({ ...a, [k]: e.target.value }))}
                    />
                  </div>
                ))}
                <Button onClick={saveAddress} className="sm:col-span-2">
                  Save address
                </Button>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
                    addressId === a.id ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <span className="text-sm">
                    <strong>{a.fullName}</strong> · {a.phone}
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="font-medium">Payment</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { id: 'COD' as const, label: 'Cash on Delivery' },
                { id: 'RAZORPAY' as const, label: 'UPI / Card / Netbanking' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`rounded-xl border p-4 text-left text-sm ${
                    paymentMethod === m.id ? 'border-primary bg-primary/10' : 'border-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="label-field">Order notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </section>
        </div>

        <aside className="glass h-fit rounded-2xl p-6">
          <h2 className="font-medium">Summary</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="line-clamp-1">
                  {i.product.name} × {i.quantity}
                </span>
                <span className="text-white">{formatInr(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{formatInr(cart.summary.total)}</span>
            </div>
          </div>
          <Button className="mt-6 w-full" size="lg" loading={loading} onClick={placeOrder}>
            Place order
          </Button>
        </aside>
      </div>
    </div>
  );
}
