import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { isDbReady } from "@/lib/db/ready";
import { prisma } from "@/lib/prisma";

const newsletterSchema = z.object({
  email: z.string().email(),
  resourcePreference: z.string().min(1),
});

export const POST = withApiHandler(async (request: Request) => {
  const body = newsletterSchema.parse(await request.json());

  if (!(await isDbReady())) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const lead = await prisma.newsletterLead.upsert({
    where: { email: body.email },
    create: {
      email: body.email,
      resourcePreference: body.resourcePreference,
    },
    update: {
      resourcePreference: body.resourcePreference,
      unsubscribedAt: null,
    },
  });

  return NextResponse.json({ ok: true, persisted: true, id: lead.id });
});
