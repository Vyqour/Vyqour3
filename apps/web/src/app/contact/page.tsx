'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  return (
    <div className="container-px py-10 md:py-14">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Contact</p>
          <h1 className="mt-2 text-3xl font-medium md:text-4xl">Let&apos;s talk</h1>
          <p className="mt-4 text-muted-foreground">
            Order help, collaborations, or press — we read every message.
          </p>
          <div className="mt-8 space-y-3 text-sm text-muted-foreground">
            <p>Email: support@vyqour.com</p>
            <p>Hours: Mon–Sat, 10:00–18:00 IST</p>
            <p>Based in India</p>
          </div>
        </div>
        <form
          className="glass space-y-4 rounded-3xl p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              toast.success('Message sent — we will reply soon.');
              setForm({ name: '', email: '', subject: '', message: '' });
            }, 600);
          }}
        >
          <div>
            <label className="label-field">Name</label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Email</label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Subject</label>
            <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Message</label>
            <Textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Send message
          </Button>
        </form>
      </div>
    </div>
  );
}
