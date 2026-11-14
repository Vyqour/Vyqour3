'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Order, Paginated } from '@/types';
import { formatInr } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

export default function OrdersPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retryingPaymentId, setRetryingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
  }, [hydrated, user, router]);

  const loadOrders = () => {
    apiClient
      .get<Paginated<Order>>('/orders/mine', { auth: true })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const retryPayment = async (order: Order) => {
    setRetryingPaymentId(order.id);
    try {
      const pay = await apiClient.post<{
        razorpayOrderId: string;
        amount: number;
        currency?: string;
        keyId: string;
        mock?: boolean;
      }>(`/payments/orders/${order.id}/create`, {}, { auth: true });

      const verify = async (paymentId: string, signature: string) => {
        await apiClient.post('/payments/verify', {
          orderId: order.id,
          razorpayOrderId: pay.razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        }, { auth: true });
        toast.success('Payment verified');
        loadOrders();
      };

      if (pay.mock) {
        await verify(`pay_mock_${Date.now()}`, 'mock');
        return;
      }

      await loadRazorpayScript();
      const RazorpayCtor = (window as unknown as {
        Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
      }).Razorpay;
      if (!RazorpayCtor) throw new Error('Unable to load payment gateway. Please try again.');

      const instance = new RazorpayCtor({
        key: pay.keyId,
        amount: pay.amount,
        currency: pay.currency || 'INR',
        name: 'VYQOUR',
        description: `Payment for ${order.orderNumber}`,
        order_id: pay.razorpayOrderId,
        prefill: {
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#5B21B6' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiClient.post('/payments/verify', {
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }, { auth: true });
            toast.success('Payment successful');
            loadOrders();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Payment verification failed');
          } finally {
            setRetryingPaymentId(null);
          }
        },
        modal: {
          ondismiss: () => setRetryingPaymentId(null),
        },
      });
      instance.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to retry payment');
      setRetryingPaymentId(null);
    }
  };

  const loadRazorpayScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const existing = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null;
      if (existing?.dataset.loaded === 'true') return resolve();
      const script = existing || document.createElement('script');
      const onLoad = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      const onError = () => {
        script.remove();
        reject(new Error('Failed to load Razorpay'));
      };
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (!existing) {
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(script);
      }
    });

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await apiClient.post(`/orders/${orderId}/cancel`, { reason: 'Cancelled by customer' }, { auth: true });
      toast.success('Order cancelled');
      loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  if (!hydrated || loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container-px py-10 md:py-14">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-white">
        ← Account
      </Link>
      <h1 className="mt-4 text-3xl font-medium">Orders</h1>
      {!data?.data?.length ? (
        <div className="mt-10">
          <EmptyState title="No orders yet" actionLabel="Start shopping" actionHref="/shop" />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {data.data.map((o) => (
            <div key={o.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <Badge>{o.status}</Badge>
                  <p className="mt-2 font-semibold">{formatInr(Number(o.total))}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(' · ')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Link href={`/track-order?order=${o.orderNumber}`} className="text-sm text-primary-glow">
                  Track order →
                </Link>
                {o.paymentMethod === 'RAZORPAY' &&
                  o.paymentStatus !== 'PAID' &&
                  CANCELLABLE_STATUSES.includes(o.status) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={retryingPaymentId === o.id}
                    onClick={() => retryPayment(o)}
                  >
                    Retry payment
                  </Button>
                )}
                {CANCELLABLE_STATUSES.includes(o.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={cancellingId === o.id}
                    onClick={() => cancelOrder(o.id)}
                  >
                    Cancel order
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
      }
