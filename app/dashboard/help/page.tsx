import Link from "next/link"
import { BookOpen, CheckCircle2, MessageSquarePlus, PlayCircle, Search } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const guides = [
  { title: "Add and invite your first client", time: "2 min", steps: ["Open Clients and choose Add Client.", "Enter only the information you need.", "Send the secure invitation or copy the invitation link."], href: "/dashboard/clients" },
  { title: "Assign between-session work", time: "3 min", steps: ["Choose a client.", "Select an existing worksheet or generate one with AI.", "Set a due date and review the assignment before sending."], href: "/dashboard/library" },
  { title: "Prepare for a session", time: "2 min", steps: ["Open a client or today’s schedule.", "Choose Prepare.", "Review activity, trends, talking points, and save your notes."], href: "/dashboard/clients" },
  { title: "Connect your calendar", time: "2 min", steps: ["Open Settings.", "Connect Google Calendar.", "Match upcoming appointments to clients for one-click preparation."], href: "/dashboard/settings" },
]

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Help center</p>
        <h1 className="mt-3 text-3xl font-bold">What would you like to do?</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Short, practical walkthroughs for the workflows therapists use most.</p>
        <div className="relative mt-6 max-w-xl">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <Input aria-label="Search help" placeholder="Search getting started guides…" className="h-11 rounded-xl border-white/10 bg-white pl-11 text-slate-950" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.title} className="rounded-3xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-2xl bg-primary/10 p-3 text-primary"><PlayCircle className="h-5 w-5" /></span>
                <span className="text-xs font-medium text-muted-foreground">{guide.time}</span>
              </div>
              <CardTitle className="pt-2 text-lg">{guide.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {guide.steps.map((step) => <li key={step} className="flex gap-3 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />{step}</li>)}
              </ol>
              <Button asChild variant="outline" className="mt-5 rounded-xl"><Link href={guide.href}>Open this area</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Common questions</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="invite"><AccordionTrigger>What if an invitation email doesn’t arrive?</AccordionTrigger><AccordionContent>Confirm the email address, check spam, then resend it or securely share the manual invitation link from the client page.</AccordionContent></AccordionItem>
            <AccordionItem value="ai"><AccordionTrigger>What information does AI Session Prep use?</AccordionTrigger><AccordionContent>It summarizes activity already available to the therapist, including assignments, check-ins, reflections, and therapist notes. Always review AI output before clinical use.</AccordionContent></AccordionItem>
            <AccordionItem value="privacy"><AccordionTrigger>What should I avoid putting in feedback?</AccordionTrigger><AccordionContent>Do not include client names, screenshots containing client details, diagnoses, notes, or other protected health information.</AccordionContent></AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:flex-row sm:items-center">
        <div><h2 className="font-semibold">Still need help?</h2><p className="mt-1 text-sm text-muted-foreground">Use the Send Feedback button and choose the option that best describes your issue.</p></div>
        <Button variant="outline" className="rounded-xl"><MessageSquarePlus className="mr-2 h-4 w-4" /> Send Feedback below</Button>
      </div>
    </div>
  )
}
