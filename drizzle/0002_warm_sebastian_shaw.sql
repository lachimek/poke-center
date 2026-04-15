CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"public_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"etag" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "images_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "saved_cards" ADD COLUMN "front_raw_image_id" uuid;--> statement-breakpoint
ALTER TABLE "saved_cards" ADD COLUMN "front_image_id" uuid;--> statement-breakpoint
ALTER TABLE "saved_cards" ADD COLUMN "back_raw_image_id" uuid;--> statement-breakpoint
ALTER TABLE "saved_cards" ADD COLUMN "back_image_id" uuid;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "images_user_id_idx" ON "images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "images_created_at_idx" ON "images" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_front_raw_image_id_images_id_fk" FOREIGN KEY ("front_raw_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_front_image_id_images_id_fk" FOREIGN KEY ("front_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_back_raw_image_id_images_id_fk" FOREIGN KEY ("back_raw_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_back_image_id_images_id_fk" FOREIGN KEY ("back_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;