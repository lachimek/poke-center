import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { images, wipCards } from "@/lib/db/schema";
import { signObjectUrl } from "@/lib/storage/r2";
import { deleteWipCardCascade } from "@/lib/storage/wipCardService";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "You must be signed in." },
      { status: 401 },
    );
  }

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid WIP card id." },
      { status: 400 },
    );
  }

  const frontRaw = alias(images, "front_raw_image");
  const backRaw = alias(images, "back_raw_image");

  const [row] = await db
    .select({
      id: wipCards.id,
      name: wipCards.name,
      createdAt: wipCards.createdAt,
      frontRawObjectKey: frontRaw.objectKey,
      frontRawMimeType: frontRaw.mimeType,
      backRawObjectKey: backRaw.objectKey,
      backRawMimeType: backRaw.mimeType,
    })
    .from(wipCards)
    .leftJoin(frontRaw, eq(wipCards.frontRawImageId, frontRaw.id))
    .leftJoin(backRaw, eq(wipCards.backRawImageId, backRaw.id))
    .where(and(eq(wipCards.id, id), eq(wipCards.userId, userId)))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "WIP card not found." },
      { status: 404 },
    );
  }

  const [frontRawUrl, backRawUrl] = await Promise.all([
    row.frontRawObjectKey ? signObjectUrl(row.frontRawObjectKey) : null,
    row.backRawObjectKey ? signObjectUrl(row.backRawObjectKey) : null,
  ]);

  return NextResponse.json({
    ok: true,
    card: {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      frontRawUrl,
      frontRawMimeType: row.frontRawMimeType,
      backRawUrl,
      backRawMimeType: row.backRawMimeType,
    },
  });
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "You must be signed in." },
      { status: 401 },
    );
  }

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid WIP card id." },
      { status: 400 },
    );
  }

  const deleted = await deleteWipCardCascade(userId, id);
  if (!deleted) {
    return NextResponse.json(
      { ok: false, error: "WIP card not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
