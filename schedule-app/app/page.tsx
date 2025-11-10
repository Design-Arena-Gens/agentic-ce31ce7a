"use client";

import { useEffect, useMemo, useState } from "react";
import {
  categoryConfig,
  dailySchedule,
  durationInMinutes,
  ScheduleItem,
  toMinutes,
} from "@/lib/schedule";

type ScheduleWithOffsets = ScheduleItem & {
  offsetStart: number;
  offsetEnd: number;
  duration: number;
};

const numberFormatter = new Intl.NumberFormat("bn-BD");
const timeFormatter = new Intl.DateTimeFormat("bn-BD", {
  hour: "numeric",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("bn-BD", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const totalMinutes = dailySchedule.reduce(
  (sum, item) => sum + durationInMinutes(item.start, item.end),
  0,
);

const toDate = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const computeRelativeNow = () => {
  const now = new Date();
  const dayStartMinutes = toMinutes(dailySchedule[0].start);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const raw = nowMinutes - dayStartMinutes;
  return ((raw % totalMinutes) + totalMinutes) % totalMinutes;
};

export default function Home() {
  const schedule = useMemo<ScheduleWithOffsets[]>(() => {
    return dailySchedule.reduce<ScheduleWithOffsets[]>((acc, item) => {
      const duration = durationInMinutes(item.start, item.end);
      const offsetStart = acc.length > 0 ? acc[acc.length - 1].offsetEnd : 0;
      acc.push({
        ...item,
        offsetStart,
        offsetEnd: offsetStart + duration,
        duration,
      });
      return acc;
    }, []);
  }, []);

  const [relativeNow, setRelativeNow] = useState<number>(computeRelativeNow);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setRelativeNow(computeRelativeNow());
      setCurrentDate(new Date());
    }, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const activeBlock =
    schedule.find(
      (block) => relativeNow >= block.offsetStart && relativeNow < block.offsetEnd,
    ) ?? schedule[0];

  const nextBlock =
    schedule.find((block) => block.offsetStart >= activeBlock.offsetEnd) ??
    schedule[0];

  const dayProgress = Math.min(Math.max(relativeNow / totalMinutes, 0), 1);

  const totalsByCategory = useMemo(
    () =>
      schedule.reduce<Record<string, number>>((acc, block) => {
        acc[block.category] = (acc[block.category] ?? 0) + block.duration;
        return acc;
      }, {}),
    [schedule],
  );

  const upcomingBlocks = schedule
    .filter((block) => block.offsetStart > relativeNow)
    .slice(0, 3);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 pb-16 pt-12 lg:flex-row lg:pt-20">
      <aside className="flex w-full flex-col gap-7 lg:max-w-[360px]">
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04] p-8 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.35)] backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-transparent to-transparent" />
          <div className="relative flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-white/40">
                আজকের দিনপঞ্জি
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight text-white">
                Creator Day Flow
              </h1>
              <p className="text-sm text-white/60">
                {dateFormatter.format(currentDate)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">এখন সময়</span>
                <span className="text-xs font-medium uppercase text-emerald-300/90">
                  {Math.round(dayProgress * 100)}% সম্পন্ন
                </span>
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                {timeFormatter.format(currentDate)}
              </p>
              <div className="mt-5 h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-500"
                  style={{ width: `${Math.max(dayProgress * 100, 4)}%` }}
                />
              </div>
            </div>
            <div className="space-y-3 text-sm text-white/70">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  চলছে
                </p>
                <p className="mt-1 text-lg font-medium text-white">
                  {activeBlock.title}
                </p>
                <p className="text-sm text-white/60">
                  {[
                    timeFormatter.format(toDate(activeBlock.start)),
                    timeFormatter.format(toDate(activeBlock.end)),
                  ].join(" – ")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  পরবর্তী
                </p>
                <p className="mt-1 text-base font-medium text-white">
                  {nextBlock.title}
                </p>
                <p className="text-sm text-white/60">
                  {[
                    timeFormatter.format(toDate(nextBlock.start)),
                    timeFormatter.format(toDate(nextBlock.end)),
                  ].join(" – ")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur">
          <h2 className="text-sm uppercase tracking-[0.32em] text-white/40">
            ফোকাস জোন
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const total = totalsByCategory[key] ?? 0;
              const hours = Math.floor(total / 60);
              const minutes = total % 60;
              const prettyDuration =
                hours > 0 && minutes > 0
                  ? `${numberFormatter.format(hours)} ঘন্টা ${numberFormatter.format(minutes)} মিনিট`
                  : hours > 0
                    ? `${numberFormatter.format(hours)} ঘন্টা`
                    : `${numberFormatter.format(minutes)} মিনিট`;

              return (
                <div
                  key={key}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div
                    className={`absolute inset-0 opacity-0 transition-all duration-300 group-hover:opacity-70 bg-gradient-to-br ${config.accent}`}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{config.icon}</span>
                      <span className="text-sm font-medium text-white/70">
                        {Math.round((total / totalMinutes) * 100)}%
                      </span>
                    </div>
                    <p className="mt-2 text-base font-semibold text-white">
                      {config.label}
                    </p>
                    <p className="text-xs text-white/60">{prettyDuration}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur">
          <h3 className="text-sm uppercase tracking-[0.32em] text-white/40">
            পরবর্তী কয়েক ধাপ
          </h3>
          <ul className="mt-4 space-y-4 text-sm text-white/75">
            {upcomingBlocks.length === 0 ? (
              <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-white">সব কাজ শেষ!</p>
                <p className="text-xs text-white/60">
                  আজকের পরিকল্পনা সফলভাবে সম্পন্ন হয়েছে।
                </p>
              </li>
            ) : (
              upcomingBlocks.map((block) => (
                <li
                  key={`${block.title}-${block.start}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                    {timeFormatter.format(toDate(block.start))} →
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {block.title}
                  </p>
                  <p className="text-xs text-white/60">
                    {block.details.slice(0, 2).join(", ")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </aside>

      <section className="relative flex w-full flex-col justify-between gap-8 rounded-3xl border border-white/15 bg-white/[0.04] p-8 backdrop-blur">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.32em] text-white/40">
            দৈনিক টাইমলাইন
          </p>
          <h2 className="text-2xl font-semibold text-white">
            সকাল ৭টা থেকে রাত ১১:৩০ — ভারসাম্যপূর্ণ কনটেন্ট রুটিন
          </h2>
          <p className="text-sm text-white/60">
            শিখুন, তৈরি করুন, লাইভ যান এবং বিশ্রামে যান — প্রতিটি অংশের জন্য
            আলাদা স্পেস।
          </p>
        </header>

        <div className="relative mt-2 flex min-h-[860px] flex-1 flex-col gap-6">
          <div className="absolute left-[1.9rem] top-0 bottom-0 w-px bg-white/15" />
          <div
            className="pointer-events-none absolute left-[1.9rem] right-6 -translate-y-1/2"
            style={{ top: `${(relativeNow / totalMinutes) * 100}%` }}
          >
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.32em] text-white/60 transition-all">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-white/0" />
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                {timeFormatter.format(currentDate)}
              </span>
            </div>
          </div>

          {schedule.map((block) => {
            const config = categoryConfig[block.category];
            const isActive =
              block.offsetStart <= relativeNow && block.offsetEnd > relativeNow;
            const isPast = block.offsetEnd <= relativeNow;
            const opacity = isPast ? "opacity-50" : "opacity-100";

            return (
              <article
                key={`${block.title}-${block.start}`}
                className={`relative flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-500 ${opacity}`}
                style={{
                  flexGrow: block.duration,
                  minHeight: 120,
                }}
              >
                <div className="absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/40 text-xl">
                  {config.icon}
                </div>
                <div className="absolute left-3.5 top-0 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.08)]" />
                <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 ${config.accent}`}
                    style={{ opacity: isActive ? 0.45 : 0.0 }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 pl-14">
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.32em] text-white/60">
                    {config.label}
                  </span>
                  <span className="text-sm text-white/70">
                    {timeFormatter.format(toDate(block.start))} —{" "}
                    {timeFormatter.format(toDate(block.end))}
                  </span>
                  <span className="text-xs text-white/40">
                    {renderDuration(block.duration)}
                  </span>
                </div>
                <h3 className="pl-14 text-2xl font-semibold tracking-tight text-white">
                  {block.title}
                </h3>
                <ul className="pl-14 text-sm text-white/70">
                  {block.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

const renderDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${numberFormatter.format(minutes)} মিনিট`;
  }

  if (remainder === 0) {
    return `${numberFormatter.format(hours)} ঘন্টা`;
  }

  return `${numberFormatter.format(hours)} ঘন্টা ${numberFormatter.format(remainder)} মিনিট`;
};
