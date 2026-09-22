CREATE TABLE "presupuestos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "presupuestos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"categoria_id" integer NOT NULL,
	"mes" text NOT NULL,
	"moneda" text NOT NULL,
	"monto_limite_centavos" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "presupuestos_fondo_categoria_mes_idx" ON "presupuestos" USING btree ("fondo_id","categoria_id","mes");--> statement-breakpoint
CREATE INDEX "presupuestos_user_id_idx" ON "presupuestos" USING btree ("user_id");