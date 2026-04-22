CREATE TABLE "wip_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"front_raw_image_id" uuid,
	"back_raw_image_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wip_cards" ADD CONSTRAINT "wip_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wip_cards" ADD CONSTRAINT "wip_cards_front_raw_image_id_images_id_fk" FOREIGN KEY ("front_raw_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wip_cards" ADD CONSTRAINT "wip_cards_back_raw_image_id_images_id_fk" FOREIGN KEY ("back_raw_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wip_cards_user_id_idx" ON "wip_cards" USING btree ("user_id");