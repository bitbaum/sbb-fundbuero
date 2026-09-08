CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_kind" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"question" text NOT NULL,
	"asked_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answer" text,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "claim_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"confidence" text NOT NULL,
	"resolver_name" text NOT NULL,
	"resolver_staff_id" text,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"found_item_id" uuid NOT NULL,
	"claimant_contact_id" uuid,
	"report_id" uuid,
	"state" text DEFAULT 'opened' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"locale" text DEFAULT 'de' NOT NULL,
	"delete_after" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_reachable" CHECK ("contacts"."email" IS NOT NULL OR "contacts"."phone" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "formation_coaches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"coach_number" text,
	"evn" text,
	"sectors" text,
	"track" text
);
--> statement-breakpoint
CREATE TABLE "formations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "found_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"journey_id" uuid,
	"coach" text,
	"seat" text,
	"area" text,
	"found_at" timestamp with time zone NOT NULL,
	"found_by" text,
	"custody_location" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"description_tokens" text[],
	"colour" text,
	"brand" text,
	"estimated_value_chf" numeric(10, 2),
	"state" text DEFAULT 'in_custody' NOT NULL,
	"disposal_eligible_at" timestamp with time zone NOT NULL,
	"delete_after" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid,
	"found_item_id" uuid,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"value_display" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identifiers_exactly_one_owner" CHECK (num_nonnulls("identifiers"."report_id", "identifiers"."found_item_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "journey_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"stop_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"arrival_at" timestamp with time zone,
	"departure_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sjyid" text NOT NULL,
	"operating_date" date NOT NULL,
	"train_number" text,
	"line" text,
	"operator_code" text,
	"origin_stop_id" text,
	"destination_stop_id" text,
	"departure_at" timestamp with time zone,
	"arrival_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"found_item_id" uuid NOT NULL,
	"tier" text NOT NULL,
	"points" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" text DEFAULT 'proposed' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"contact_id" uuid,
	"journey_id" uuid,
	"coach" text,
	"seat" text,
	"area" text,
	"lost_from" timestamp with time zone,
	"lost_to" timestamp with time zone,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"description_tokens" text[],
	"colour" text,
	"brand" text,
	"state" text DEFAULT 'submitted' NOT NULL,
	"locale" text DEFAULT 'de' NOT NULL,
	"delete_after" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_window_ordered" CHECK ("reports"."lost_to" IS NULL OR "reports"."lost_from" IS NULL OR "reports"."lost_to" >= "reports"."lost_from")
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" text PRIMARY KEY NOT NULL,
	"uic" integer,
	"name" text NOT NULL,
	"lat" numeric(9, 6),
	"lon" numeric(9, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_resolutions" ADD CONSTRAINT "claim_resolutions_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_contact_id_contacts_id_fk" FOREIGN KEY ("claimant_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_coaches" ADD CONSTRAINT "formation_coaches_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formations" ADD CONSTRAINT "formations_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identifiers" ADD CONSTRAINT "identifiers_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identifiers" ADD CONSTRAINT "identifiers_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_calls" ADD CONSTRAINT "journey_calls_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_calls" ADD CONSTRAINT "journey_calls_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_origin_stop_id_stops_id_fk" FOREIGN KEY ("origin_stop_id") REFERENCES "public"."stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_destination_stop_id_stops_id_fk" FOREIGN KEY ("destination_stop_id") REFERENCES "public"."stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_kind","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "challenges_claim_idx" ON "challenges" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claim_resolutions_claim_idx" ON "claim_resolutions" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claims_found_item_idx" ON "claims" USING btree ("found_item_id");--> statement-breakpoint
CREATE INDEX "claims_state_idx" ON "claims" USING btree ("state");--> statement-breakpoint
CREATE INDEX "contacts_delete_after_idx" ON "contacts" USING btree ("delete_after");--> statement-breakpoint
CREATE UNIQUE INDEX "formation_coaches_position_key" ON "formation_coaches" USING btree ("formation_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "formations_journey_key" ON "formations" USING btree ("journey_id");--> statement-breakpoint
CREATE UNIQUE INDEX "found_items_reference_key" ON "found_items" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "found_items_journey_idx" ON "found_items" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "found_items_state_idx" ON "found_items" USING btree ("state");--> statement-breakpoint
CREATE INDEX "found_items_disposal_idx" ON "found_items" USING btree ("disposal_eligible_at");--> statement-breakpoint
CREATE INDEX "found_items_delete_after_idx" ON "found_items" USING btree ("delete_after");--> statement-breakpoint
CREATE INDEX "identifiers_kind_value_idx" ON "identifiers" USING btree ("kind","value");--> statement-breakpoint
CREATE INDEX "identifiers_report_idx" ON "identifiers" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "identifiers_found_item_idx" ON "identifiers" USING btree ("found_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identifiers_report_unique" ON "identifiers" USING btree ("report_id","kind","value") WHERE "identifiers"."report_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "identifiers_found_item_unique" ON "identifiers" USING btree ("found_item_id","kind","value") WHERE "identifiers"."found_item_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "journey_calls_journey_sequence_key" ON "journey_calls" USING btree ("journey_id","sequence");--> statement-breakpoint
CREATE INDEX "journey_calls_stop_time_idx" ON "journey_calls" USING btree ("stop_id","departure_at");--> statement-breakpoint
CREATE UNIQUE INDEX "journeys_sjyid_date_key" ON "journeys" USING btree ("sjyid","operating_date");--> statement-breakpoint
CREATE INDEX "journeys_train_number_idx" ON "journeys" USING btree ("train_number","operating_date");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_pair_key" ON "matches" USING btree ("report_id","found_item_id");--> statement-breakpoint
CREATE INDEX "matches_tier_idx" ON "matches" USING btree ("tier","points");--> statement-breakpoint
CREATE INDEX "matches_state_idx" ON "matches" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_reference_key" ON "reports" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "reports_journey_idx" ON "reports" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "reports_state_idx" ON "reports" USING btree ("state");--> statement-breakpoint
CREATE INDEX "reports_delete_after_idx" ON "reports" USING btree ("delete_after");--> statement-breakpoint
CREATE INDEX "stops_uic_idx" ON "stops" USING btree ("uic");--> statement-breakpoint
CREATE INDEX "stops_name_idx" ON "stops" USING btree ("name");