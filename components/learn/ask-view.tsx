'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { MessageCircleQuestion, Send } from 'lucide-react';
import { Breadcrumbs, EmptyState, SectionHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/misc';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { useAuthStore } from '@/store/auth';
import { FAQS } from '@/data/learn';

const schema = z.object({
  name: z.string().min(2, 'Tell us your first name and class/city'),
  question: z.string().min(10, 'Your question should be at least 10 characters').max(400, 'Keep it under 400 characters'),
});

export function AskView() {
  const user = useAuthStore((s) => s.user);
  const invalidate = useInvalidate();
  const { data, isPending } = useApi(['questions'], api.getQuestions);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: user?.name ?? '', question: '' } });
  const answered = (data ?? []).filter((q) => q.status === 'answered');

  const onSubmit = async (v: z.infer<typeof schema>) => {
    await api.askQuestion({ askedBy: v.name, question: v.question, userId: user?.id });
    toast.success('Question sent!', { description: 'A moderator will review it and a scientist will answer (demo).' });
    reset({ name: v.name, question: '' });
    invalidate([['questions']]);
  };

  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Learn', href: '/learn' }, { label: 'Ask a scientist' }]} />
      <SectionHeader as="h1" eyebrow="Learn" title="Ask a scientist" description="Curious about ice, penguins or life at a polar station? Ask away — answers are published after moderation." />
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="h-fit space-y-4 rounded-lg border bg-card p-5 lg:sticky lg:top-28">
          <h2 className="flex items-center gap-2 font-semibold"><MessageCircleQuestion className="h-5 w-5 text-primary" aria-hidden /> Your question</h2>
          <div className="space-y-1">
            <Label htmlFor="ask-name">Name (e.g. “Riya, Class 7, Pune”)</Label>
            <Input id="ask-name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'ask-name-err' : undefined} {...register('name')} />
            {errors.name && <p id="ask-name-err" className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ask-q">Question</Label>
            <Textarea id="ask-q" rows={5} aria-invalid={!!errors.question} aria-describedby={errors.question ? 'ask-q-err' : undefined} {...register('question')} />
            {errors.question && <p id="ask-q-err" className="text-xs text-destructive">{errors.question.message}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Please don’t include personal details like phone numbers. Questions are moderated.</p>
          <Button type="submit" loading={isSubmitting} className="w-full"><Send /> Send question</Button>
        </form>
        <div className="space-y-8">
          <section aria-labelledby="answered">
            <h2 id="answered" className="mb-3 text-xl font-semibold">Answered questions</h2>
            {isPending ? <TableSkeleton rows={4} cols={1} /> : answered.length === 0 ? <EmptyState title="No answers yet" /> : (
              <ul className="space-y-3">
                {answered.map((q) => (
                  <li key={q.id} className="rounded-lg border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{q.askedBy} · {q.createdAt}</p>
                    <p className="mt-1 font-medium">{q.question}</p>
                    <p className="mt-2 rounded-md bg-accent p-3 text-sm text-accent-foreground"><strong>{q.answeredBy}:</strong> {q.answer}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="faq">
            <h2 id="faq" className="mb-3 text-xl font-semibold">Frequently asked</h2>
            <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
              {FAQS.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </div>
    </div>
  );
}
