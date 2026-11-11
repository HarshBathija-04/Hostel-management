import { Link } from 'react-router';
import { ArrowRight, BedDouble, ClipboardCheck, CreditCard, ShieldCheck, Wrench } from 'lucide-react';
import { PublicShell } from '../components/Layout';
import { BedPips, buttonCls, cx } from '../components/ui';

// Illustrative floor for the hero board (static, not live data).
const floor = [
  { room: '201', cap: 2, occ: 2 }, { room: '202', cap: 2, occ: 1 }, { room: '203', cap: 3, occ: 3 },
  { room: '204', cap: 1, occ: 0 }, { room: '205', cap: 2, occ: 2 }, { room: '206', cap: 3, occ: 1 },
  { room: '207', cap: 4, occ: 2 }, { room: '208', cap: 2, occ: 0, maint: true }, { room: '209', cap: 1, occ: 1 },
];

const features = [
  { icon: ClipboardCheck, title: 'Applications with a paper trail', body: 'Students apply with block and room-type preferences. Wardens approve, waitlist or reject with remarks the student can read.' },
  { icon: BedDouble, title: 'Bed-level allocation', body: 'Every room shows which beds are taken. Gender-specific blocks, maintenance holds and capacity are enforced by the database.' },
  { icon: CreditCard, title: 'Fees that add up', body: 'Deposits and monthly rent are recorded against each stay, so dues and collections are always one query away.' },
  { icon: Wrench, title: 'Complaints that get closed', body: 'Residents raise maintenance tickets tied to their room; wardens triage by priority and reply in the same thread.' },
];

export default function Landing() {
  return (
    <PublicShell>
      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 ring-inset">
              <ShieldCheck className="size-3.5" aria-hidden /> Student housing, without the spreadsheets
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
              Every bed, application and rupee in your hostel, in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Hostel Hub gives residents a self-service portal to apply for rooms, pay fees and report issues, and gives wardens a live
              view of occupancy across every block.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className={cx(buttonCls(), 'min-h-12 px-5 text-base')}>
                Open the student portal <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/admin/login" className={cx(buttonCls('secondary'), 'min-h-12 px-5 text-base')}>
                Warden console
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Demo accounts are pre-filled on each login screen.</p>
          </div>

          <figure aria-label="Example occupancy board for one floor" className="rounded-[20px] border border-line bg-surface p-5 shadow-pop sm:p-6">
            <figcaption className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Boys Block A · Floor 2</p>
                <p className="mt-1 font-display text-xl font-semibold">12 of 20 beds taken</p>
              </div>
              <span className="tabular rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700">60%</span>
            </figcaption>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {floor.map((r) => (
                <div
                  key={r.room}
                  className={cx(
                    'rounded-xl border p-3',
                    r.maint ? 'border-amber-400/50 bg-amber-100/60' : r.occ === r.cap ? 'border-line bg-sunken/70' : 'border-line bg-canvas/60',
                  )}
                >
                  <p className="tabular text-sm font-semibold">{r.room}</p>
                  <div className="mt-2">
                    <BedPips capacity={r.cap} occupied={r.occ} size="sm" />
                  </div>
                  <p className="mt-2 text-[11px] text-muted">{r.maint ? 'Maintenance' : r.occ === r.cap ? 'Full' : `${r.cap - r.occ} free`}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-[3px] bg-brand-600" /> Occupied</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-[3px] ring-1 ring-line-strong ring-inset" /> Free bed</span>
            </div>
          </figure>
        </section>

        <section aria-labelledby="features" className="border-y border-line bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="features" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Built around how a hostel actually runs</h2>
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-700 text-white" aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="flow" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="flow" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">From application to keys in three steps</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Apply', 'Pick a preferred block, room type and start date. Only blocks open to you are shown.'],
              ['Get allotted', 'A warden assigns a specific bed. Room occupancy updates instantly.'],
              ['Live in', 'See your roommates, warden contact, fee history and open tickets.'],
            ].map(([title, body], i) => (
              <li key={title} className="rounded-card border border-line bg-surface p-5 shadow-card">
                <span className="tabular font-display text-3xl font-semibold text-brand-500">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </PublicShell>
  );
}
